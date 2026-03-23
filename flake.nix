{
  description = "CozoScript tree-sitter grammar";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [
        "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"
      ];
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          grammar = pkgs.stdenv.mkDerivation {
            pname = "tree-sitter-cozo";
            version = self.shortRev or self.dirtyShortRev or "dev";
            src = self;

            nativeBuildInputs = [ pkgs.tree-sitter ];

            buildPhase = ''
              runHook preBuild
              $CC -fPIC -c -I. -O2 src/parser.c -o parser.o
              $CC -shared -o libtree-sitter-cozo.so parser.o
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall
              mkdir -p $out/lib $out/queries $out/src
              cp -v libtree-sitter-cozo.so $out/lib/
              cp -rv queries/* $out/queries/
              cp src/grammar.json $out/src/
              cp src/node-types.json $out/src/
              runHook postInstall
            '';
          };
        in
        {
          default = grammar;
          tree-sitter-cozo = grammar;
        });

      overlays.default = final: prev: {
        tree-sitter-cozo = self.packages.${final.system}.default;
      };
    };
}
