# ASM Converter

Makes ASM written for NSMBe compatible with NCPatcher

## Usage

Convert a single file:
```console
asmconverter.py file -i old.s -o new.s
```

Convert multiple files:
```console
asmconverter.py file -i old1.s old2.s -o new1.s new2.s
```

Convert all asm files in a directory:
```console
asmconverter.py dir -i olddir -o newdir
```

Optional arguments:

`-s (--symbols) [old_symbols.x/map]` - attempt to replace old symbols with their addresses (use symbols.x from Dirbaio's template or game.map from Newer DS)

`-ns (--new_symbols) [new_symbols.x]` - attempt to replace addresses with symbol names (use symbols9.x from the code reference)

`-c (--credit) [author_name]` - add a comment at the top of each file crediting the original author

`-q (--quiet)` - don't log converted files
