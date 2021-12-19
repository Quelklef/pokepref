{ pkgs ? import <nixpkgs> {} }: let

my-python = pkgs.python3.withPackages (ppkgs: [ ppkgs.requests ]);

in pkgs.mkShell {
  buildinputs = [ my-python ];
  shellHook = ''
    export PYTHONPATH=${my-python}/${my-python.sitePackages}
  '';
}
