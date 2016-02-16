---
title: The quirks of PHP bcrypt
---

Last year while porting a PHP web app to .NET I found that none of the existing users could log in although both sites used bcrypt for password hashing.

This is the first of two posts digging in to the issue, starting with what was wrong with the hashes and moving on to how to work around it.


Up until version 5.5 PHP was distinctly lacking a simple idiot proof password hashing function (it now has [password_hash](http://php.net/manual/en/function.password-hash.php)). This meant every developer ended up rolling their own based on the [crypt](http://php.net/crypt) documentation. 

In the case of the project I was porting it used the following password hashing function (with a few bits removed for clarity).

``` php
<?php
function generate_salt() {
    $salt = '$2a$10$';
    $chars = './0123456789ABCDEFHIJKLMONPQRSTUVWXYZabcdefhijklmonpqrstuvwxyz';
    $chars_length = strlen( $chars ) - 1;
    for( $i = 0; $i < 21; $i++ ) {
        $salt .= $chars[ rand( 0, $chars_length ) ];
    }
    $salt .= '$';
    return $salt;
}

$salt = generate_salt();
$password_digest = crypt( $_POST['password'], $salt );
$password = substr( $password_digest, 29, 31 ); 
$user->password = $password;
$user->salt = $salt;
save_user($user);
```

The `$2a$` string at the beginning of the salt instructs crypt to use blowfish hashing (bcrypt) and then the `10` is a cost factor, in this case the blowfish hash will be run 2<sup>10</sup> times.

It then expects 22 (not 21 as generated in the example above) characters in the range "./0-9A-Za-z", anything else is an invalid salt that should cause the hash to fail.

It turns out on PHP 5.3 if you pass in an short salt such as the one generated above that consists of 21 valid characters and then a $ symbol it will return a hash anyway. The problem being these hashes won't work with other implementations and I had a few thousand paying customers who wouldn't be able to log in once the rewrite went live.

_I'm not sure how the person who wrote the password hashing function ended up with the salt a character short with an extra $ on the end, I can only assume he mistakenly thought there should be a $ between the salt and hash, whereas in actual fact the fixed length salt makes any sort of separator unnecessary._

###What was PHP getting wrong?

The PHP documentation states "Using characters outside of this range in the salt will cause crypt() to return a zero-length string", given the string wasn't zero length this obviously required more investiation.

A bit of experimenting didn't find anything obvious so there wasn't really much option other than diving in to the [PHP source](https://github.com/php/php-src). The relevant files are `crypt.c` and `crypt_blowfish.c` in the `/ext/standard` directory.

Nothing jumped out in `crypt.c` but `crypt_blowfish.c` contains a a couple of lines with the comment `/* PHP hack */` which instantly set alarm bells ringing and gave me somewhere to focus. 

First there's the `BF_safe_atoi64` macro that converts ASCII characters in to integers, if it encounters a `$` symbol it breaks out of the calling loop.

``` c
#define BF_safe_atoi64(dst, src) \
{ \
tmp = (unsigned char)(src); \
if (tmp == '$') break; /* PHP hack */ \
if ((unsigned int)(tmp -= 0x20) >= 0x60) return -1; \
tmp = BF_atoi64[tmp]; \
if (tmp > 63) return -1; \
(dst) = tmp; \
}
```

There's also  `BF_decode` which is used to convert the ASCII salt to bytes. This uses the `BF_safe_atoi64` macro above to convert the characters of the ASCII salt in to bytes and then zero pads the resulting salt out to the required length if it's too short.

``` c
static int BF_decode(BF_word *dst, const char *src, int size)
{
    unsigned char *dptr = (unsigned char *)dst;
    unsigned char *end = dptr + size;
    const unsigned char *sptr = (const unsigned char *)src;
    unsigned int tmp, c1, c2, c3, c4;

    do {
        BF_safe_atoi64(c1, *sptr++);
        BF_safe_atoi64(c2, *sptr++);
        *dptr++ = (c1 << 2) | ((c2 & 0x30) >> 4);
        if (dptr >= end) break;

        BF_safe_atoi64(c3, *sptr++);
        *dptr++ = ((c2 & 0x0F) << 4) | ((c3 & 0x3C) >> 2);
        if (dptr >= end) break;

        BF_safe_atoi64(c4, *sptr++);
        *dptr++ = ((c3 & 0x03) << 6) | c4;
    } while (dptr < end);

    while (dptr < end) /* PHP hack */
            *dptr++ = 0;
    
    return 0;
}
```

And that looks like the caues of the problem. The `$` at the end of the salt is turning in to a zero byte.

Confirming this might've involved attaching a debugger and steping through the code, however it's over 10 years since I last did any C programming and it was taking 10's of minutes each time to build the PHP source, so I cheated and extracted the relevant parts of the PHP source in to my own source files. I then threw away any references to other hashing algorithms, removed a load of C pre-processor directives (easier than working out where they're defined) and hacked together this simple test program along with adding a simple printf to each instance of `/* PHP Hack */`.

``` c
#include <stdio.h>
#include "crypt.c"
 
int main(void)
{
    char *pass = "test";
    int pass_len = sizeof(pass);
    char *salt = "$2a$10$Z2RM.D9GFLcbORGVkI07s$"; // invalid
    int salt_len = sizeof(salt);
    char *result = NULL;
 
    int retval = php_crypt(pass, pass_len, salt, salt_len, &result);
 
    printf("Returned %d\nSalt: %s\nHash: %s\n", retval, salt, result);
    return 0;
} 
```

You can [download the full source](https://gist.github.com/martinsteel/ca4fbae9ef840ac8ab9b) if you'd like to take a look. Adding a printf on each instance of `/* PHP Hack */` gave the following output:

```
BF_safe_atoi64 PHP hack
PHP Hack padding binary salt with 0
Returned 0, Salt: $2a$10$Z2RM.D9GFLcbORGVkI07s$, Hash: $2a$10$Z2RM.D9GFLcbORGVkI07s.1H0hAeFXoZloOhosUbIEt6P0nDv0Ih6
```

So we've hit the `$` character when converting the ASCII salt to integers and added a single zero byte to the end of the salt giving us an invalid hash. 

## To conclude

While the hashes were being validated in PHP this wasn't a problem, PHP crypt always bodges the salt in the same way so comparisons worked as expected. However every other bcrypt implementation I could find bombed out when it found invalid characters in the salt preventing users from logging in.

With the bug now traced I could try to reproduce it in C# and allow existing hashed passwords to be validated, I'll cover this in a follow up post soon.

_As an aside, I've no idea why the PHP bcrypt implementation has these hacks to allow invalid salts. There's an [existing bug](https://bugs.php.net/bug.php?id=62488) about how salts are handled when they're too short, but it's been floating around since July 2012 without any comments._

_Going forward this shouldn't catch people out so much as the new password hash function generates a correct salt for you._
