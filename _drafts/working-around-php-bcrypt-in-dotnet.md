---
title: Working around PHP bcrypt in .NET
---

This is part two of a blog post on solving bcrypt hashing issues when porting an app from PHP to .NET. For part 1 [take a look here](/blog/2015/the-quirks-of-php-bcrypt/).

Lets start out with an important point, I'm by no means an expert on cryptography, my choice of BCrypt.net as a base for this PHP compatability bodge was not based on the cryptographic merits of the projects implementation - I'm not qualified to judge - although that's not to imply there's something wrong. 

My decision came down to the following simple factors:

1. BCrypt.Net is implemented as a single C# class so very easy to modify
2. It produced the same hashes as other implementations 
3. It's the most popular bcrypt package on [NuGet](http://www.nuget.org/)

**TODO write about the .NET bit!**
