using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;
using System.Windows.Media;

namespace GoatBar;

/// The right-click menu, shared by the bar and the tray icon. Dark, rounded,
/// with icons and a toggle switch, to match the hover card.
static class AgentMenu
{
    // Styles live in XAML: templating a ContextMenu/MenuItem from C# is far noisier.
    const string Xaml = """
        <ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                            xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
          <SolidColorBrush x:Key="Bg" Color="#1A1B1F"/>
          <SolidColorBrush x:Key="Line" Color="#34363D"/>
          <SolidColorBrush x:Key="Text" Color="#F0F1F3"/>
          <SolidColorBrush x:Key="Sub" Color="#9DA3AE"/>
          <SolidColorBrush x:Key="Hover" Color="#2A2C33"/>
          <SolidColorBrush x:Key="On" Color="#3F9065"/>

          <Style TargetType="ContextMenu">
            <Setter Property="OverridesDefaultStyle" Value="True"/>
            <Setter Property="HasDropShadow" Value="False"/>
            <Setter Property="Template">
              <Setter.Value>
                <ControlTemplate TargetType="ContextMenu">
                  <Border Margin="12" Padding="6" CornerRadius="10" MinWidth="236"
                          Background="{StaticResource Bg}" BorderBrush="{StaticResource Line}" BorderThickness="1">
                    <Border.Effect>
                      <DropShadowEffect BlurRadius="18" ShadowDepth="4" Direction="270" Opacity="0.55" Color="Black"/>
                    </Border.Effect>
                    <StackPanel IsItemsHost="True"/>
                  </Border>
                </ControlTemplate>
              </Setter.Value>
            </Setter>
          </Style>

          <Style TargetType="MenuItem">
            <Setter Property="OverridesDefaultStyle" Value="True"/>
            <Setter Property="Foreground" Value="{StaticResource Text}"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
              <Setter.Value>
                <ControlTemplate TargetType="MenuItem">
                  <Border x:Name="Row" Padding="10,7" CornerRadius="6" Background="Transparent">
                    <DockPanel>
                      <TextBlock x:Name="Glyph" DockPanel.Dock="Left" Width="26" VerticalAlignment="Center"
                                 FontFamily="Segoe Fluent Icons, Segoe MDL2 Assets" FontSize="14"
                                 Foreground="{StaticResource Sub}" Text="{TemplateBinding Tag}"/>
                      <Border x:Name="Switch" DockPanel.Dock="Right" Width="30" Height="16" CornerRadius="8"
                              Margin="12,0,0,0" VerticalAlignment="Center" Background="{StaticResource Line}" Visibility="Collapsed">
                        <Ellipse x:Name="Knob" Width="10" Height="10" Fill="{StaticResource Text}"
                                 HorizontalAlignment="Left" Margin="3,0"/>
                      </Border>
                      <ContentPresenter ContentSource="Header" VerticalAlignment="Center" RecognizesAccessKey="False"/>
                    </DockPanel>
                  </Border>
                  <ControlTemplate.Triggers>
                    <Trigger Property="IsHighlighted" Value="True">
                      <Setter TargetName="Row" Property="Background" Value="{StaticResource Hover}"/>
                      <Setter TargetName="Glyph" Property="Foreground" Value="{StaticResource Text}"/>
                    </Trigger>
                    <Trigger Property="IsCheckable" Value="True">
                      <Setter TargetName="Switch" Property="Visibility" Value="Visible"/>
                    </Trigger>
                    <Trigger Property="IsChecked" Value="True">
                      <Setter TargetName="Switch" Property="Background" Value="{StaticResource On}"/>
                      <Setter TargetName="Knob" Property="HorizontalAlignment" Value="Right"/>
                    </Trigger>
                    <Trigger Property="Tag" Value="{x:Null}">
                      <Setter TargetName="Glyph" Property="Visibility" Value="Collapsed"/>
                    </Trigger>
                    <Trigger Property="IsEnabled" Value="False">
                      <Setter TargetName="Row" Property="Opacity" Value="0.45"/>
                    </Trigger>
                  </ControlTemplate.Triggers>
                </ControlTemplate>
              </Setter.Value>
            </Setter>
          </Style>

          <Style TargetType="Separator">
            <Setter Property="OverridesDefaultStyle" Value="True"/>
            <Setter Property="Template">
              <Setter.Value>
                <ControlTemplate TargetType="Separator">
                  <Border Height="1" Margin="8,5" Background="{StaticResource Line}"/>
                </ControlTemplate>
              </Setter.Value>
            </Setter>
          </Style>
        </ResourceDictionary>
        """;

    static readonly ResourceDictionary Styles = (ResourceDictionary)XamlReader.Parse(Xaml);

    // Segoe Fluent Icons glyphs
    const string EyeOn = "", EyeOff = "", Power = "", Check = "", Close = "", Bell = "";

    public static ContextMenu Build(BarWindow bar, string summary)
    {
        var menu = new ContextMenu { Resources = Styles };

        var header = new StackPanel { Margin = new Thickness(2, 0, 2, 2) };
        header.Children.Add(new TextBlock { Text = "GoatBar", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = (Brush)Styles["Text"] });
        header.Children.Add(new TextBlock { Text = summary, FontSize = 11, Foreground = (Brush)Styles["Sub"], Margin = new Thickness(0, 2, 0, 0) });
        menu.Items.Add(new MenuItem { Header = header, IsHitTestVisible = false, Focusable = false });
        menu.Items.Add(Divider());

        menu.Items.Add(Item(bar.IsVisible ? "Hide bar" : "Show bar", bar.IsVisible ? EyeOff : EyeOn, bar.ToggleVisible));
        var startup = Item("Start with Windows", Power, null);
        startup.IsCheckable = true;
        startup.IsChecked = BarWindow.StartsWithWindows();
        startup.Click += (_, _) => BarWindow.SetStartWithWindows(startup.IsChecked);
        startup.StaysOpenOnClick = true; // watch the switch flip
        menu.Items.Add(startup);
        var notify = Item("Notify when a chat finishes", Bell, null);
        notify.IsCheckable = true;
        notify.IsChecked = BarWindow.NotifyOnFinish;
        notify.Click += (_, _) => BarWindow.NotifyOnFinish = notify.IsChecked;
        notify.StaysOpenOnClick = true;
        menu.Items.Add(notify);
        menu.Items.Add(Item("Mark all finished as seen", Check, bar.MarkAllSeen));
        menu.Items.Add(Divider());
        menu.Items.Add(Item("Quit GoatBar", Close, () => bar.Close()));
        return menu;
    }

    // Menus look up their own separator style key, so the implicit style has to be set explicitly.
    static Separator Divider() => new() { Style = (Style)Styles[typeof(Separator)] };

    static MenuItem Item(string text, string glyph, Action onClick)
    {
        var item = new MenuItem { Header = text, Tag = glyph };
        if (onClick != null) item.Click += (_, _) => onClick();
        return item;
    }
}
