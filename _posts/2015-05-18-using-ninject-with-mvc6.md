---
title: Using Ninject with MVC6
category: code
---

*ASP.NET 5 and MVC 6 are currently release candidates so the information in this post may change.*

Gettting Ninject working with ASP.NET 5 (also known as vNext) is really simple. Unfortunately it took me the best part of a day to to work this out as a lot of the documentation is either a work in progress or out of date (beta 4 renamed quite a few packages and methods).

The ASP.NET framework now supports DI out of the box in the [Microsoft.Framework.DependencyInjection](https://github.com/aspnet/DependencyInjection/) package. However if you want to use Autofac or Ninject - maybe because you already use them throughout the rest of your project - you'll need an adapter.

## Standard Ninject binding

The Ninject adapter package isn't yet available on NuGet so you'll need to add the ASP.NET 5 "master" branch feed from [MyGet](https://www.myget.org/gallery/aspnetmaster) to your Visual Studio NuGet package sources.

* In Visual Studio under Tools → Options → NuGet Package Manager add the feed 

  ```
  https://www.myget.org/F/aspnetmaster/
  ```

* Add the ```Microsoft.Framework.DependencyInjection.Ninject``` and ```Ninject``` packages to your project.json file (or use NuGet).

* Set up Ninject in Startup.cs

  ``` csharp
// You probably need to change this return type - defaults to void
public IServiceProvider ConfigureServices(IServiceCollection services)
{
    // Add your various services such as MVC as normal
    services.AddMvc();

    // Create a new Ninject kernel for your bindings
    var kernel = new StandardKernel();

    // Set up your bindings for DI
    kernel.Bind<IFakeRepo>().To<FakeRepo>().InRequestScope();
    
    // Add all the ASP.NET services to your Ninject kernel
    kernel.Populate(services);

    // Use Ninject to return an instance
    return kernel.Get<IServiceProvider>();
}
  ```

## Convention based binding

At work we tend to use Ninject convention based binding as it saves manually listing all the Interface/Repository combinations (it can get a bit tedious). You essentially tell Ninject what namespaces to look in and it will bind all classes to their default interfaces.

* Add the ```ninject.extensions.conventions``` NuGet package

* Set up convention based binding in Startup.cs

``` csharp
public IServiceProvider ConfigureServices(IServiceCollection services)
{
    services.AddMvc();

    var kernel = new StandardKernel();

    // This bit is the convention based binding
    // 
    // Any repository will do here it's just to find the correct DLL.
    kernel.Bind(k => k.FromAssemblyContaining<FakeRepo>() 
        .SelectAllClasses()
        // List multiple types here to look in more than one namespace
        .InNamespaceOf(typeof(FakeRepo)) 
        .BindDefaultInterfaces()
        .Configure(c => c.InRequestScope()));

    kernel.Populate(services);
    return kernel.Get<IServiceProvider>();
}
```
