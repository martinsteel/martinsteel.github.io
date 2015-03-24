If you've been using Ninject for years, this probably isn't the blog post for you. If however you're just staring out or have just been using it on the web it may be some use.

At work we've been using Ninject in our .NET MVC web projects for a while now, our Windows services on the other hand are all a few years old and haven't really changed for a good while. They tend to just instantiate classes here and there making them nigh on untestable.

A recent project has lead to us rewriting one of our core Windows services and this seemed the ideal oportunity to bring in full unit testing and dependency injection.

If you follow the Ninject documentation it's nice an easy to get started, however it's not too clear on how you actually create instances of a classes with constructor dependencies (this happens as if by magic in MVC projects).

So here's my example of how to get this working with a Windows service.

We'll start of with the basic classes our service depends upon:

* A basic reposity style setup that would normally talk to your database.

``` language-csharp
public interface IWidgetService  
{
    int CountWidgets();
}

public class WidgetService : IWidgetService  
{
    public int CountWidgets()
    {
        // Lets skip the database for now :) 
        return 5;
    }
}
```
* A processing class that makes use of your repository. We'll make use of constructor injection here.

``` language-csharp
public class WidgetProcessor  
{
    private IWidgetService _widgetService;

    public WidgetProcessor(IWidgetService widgetService)
    {
        _widgetService = widgetService;
    }

    public void DoSomething()
    {
        var widget = _widgetService.CountWidgets();
    }
}
```
##Before dependency injection

Here's a basic (and completely useless) Windows service that just instantiates classes when required.
``` language-csharp
public class WindowsService : ServiceBase  
{
    public WindowsService()
    {
        // This is the bit we want to tidy up 
        var service = new WidgetService();
        var processor = new WidgetProcessor(service);
        processor.DoSomething();
    } 
    /* lots of missing code */
}
```
##Adding Ninject

Use NuGet to add the Ninject reference to your project

Then add a class that inherits from `NinjectModule` - such as the following - that sets up mapping of your interfaces to concrete classes.
``` language-csharp
class NinjectBindings : Ninject.Modules.NinjectModule  
{
    public override void Load()
    {
        Bind<IWidgetService>().To<WidgetService>();
    }
}
```
Add a Ninject kernel in to your Windows service ready for dependency injection.
``` language-csharp
public class WindowsService : ServiceBase  
{
    public WindowsService()
    {
        var kernel = new StandardKernel();
        kernel.Load(Assembly.GetExecutingAssembly());

        // This is the bit we want to tidy up 
        var service = new WidgetService();
        var processor = new WidgetProcessor(service);
        processor.DoSomething();

    } 
    /* lots of missing code */
}
```
Inject your dependencies

So this is your final change, get rid of that `WidgetService` instance.
``` language-csharp
public class WindowsService : ServiceBase  
{
    public WindowsService()
    {
        var kernel = new StandardKernel();
        kernel.Load(Assembly.GetExecutingAssembly());

        var processor = kernel.Get<WidgetProcessor>();
        processor.DoSomething();

    } 
    /* lots of missing code */
}
```
As you can see, we completely remove any reference of the WidgetService repository and instead ask Ninject for an instance of a WidgetProcessor.

The mapping you set up in the NinjectBindings lets Ninject know which concrete classes you want in place of interfaces, so it will automatically create a WidgetService instance and pass in to the WidgetProcessor constructor leaving you with clean, testable code.
