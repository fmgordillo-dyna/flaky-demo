{
  pkgs,
  ...
}:

{
  packages = [ pkgs.alejandra ];

  # languages.rust.enable = true;
  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

}
