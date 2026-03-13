# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    (pkgs.python311.withPackages (ps: with ps; [
      pip
      python-dotenv
      numpy
    ]))
  ];

  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "ms-python.python"       # เพิ่ม Extension Python สำหรับ VS Code (IDX)
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        # ตั้งค่า preview ตามความเหมาะสมของโปรเจกต์
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Install Python packages not available in Nixpkgs
        install-packages = "pip install modal voyageai pymilvus";
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Ensure packages are installed on start
        ensure-packages = "pip install modal voyageai pymilvus";
      };
    };
  };
}
