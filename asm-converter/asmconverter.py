import argparse
import sys
import glob
import os

hook_types = {'hook':'hook', 'nsub':'jump', 'repl':'call'}
	
def replace_hook_line(in_str: str) -> str:
	end = in_str.find(':')
	hook_string = in_str[0:end]
	new_hook = hook_types.get(hook_string[0:4])
	address = hook_string[5:13]
	hook_string = f"ncp_{new_hook}(0x{address}{f',{int(hook_string[-2:],16)}' if len(hook_string) == 19 else ''})"
	return hook_string + in_str[end+1:]
		
# loads and processes symbols file
def load_symbols(in_file: str, swap_keys=False) -> dict:
	out_symbols = []
	with open(in_file, 'r', encoding='utf-8') as f:
		for line in f:
			if len(line) <= 2 or line.startswith('/'): continue
			l = line.split()
			l_len = len(l)
			if l_len >= 3: 
				del l[1] 		 	# removes '='
				if l_len >= 4:
					del l[2:] 	 	# removes any extra words
				if ';' in l[1]:
					l[1] = l[1][:-1] # removes ';' from address string
			try:	
				# convert address to int then back to hex so hex strings are all formatted the same
				l[1] = hex(int(l[1],16))
			except:
				pass
			if swap_keys:
				out_symbols.append([l[1],l[0]])
			else:
				out_symbols.append(l)

	return dict(out_symbols)

def convert(in_file: str, out_file: str, in_symbols: str=None, out_symbols: str=None, author: str=None) -> None:
	symbols = load_symbols(in_symbols) if in_symbols else None
	new_symbols = load_symbols(out_symbols,True) if out_symbols else None
	
	new_file = ''
	with open(in_file, 'r', encoding='utf-8') as f:
		for line in f:
			is_hook = False
			for k in hook_types:
				if line.startswith(k):
					line = replace_hook_line(line)
					is_hook = True
					break
							
			if not is_hook and symbols and not line.startswith('.'):
				for sym in symbols:
					sym_start = line.find(sym)
					comment_start = line.find('@')
					if sym_start != -1 and (comment_start == -1 or sym_start < comment_start):
						prev_char = line[sym_start-1]
						next_char = line[sym_start+len(sym)]

						if (prev_char not in [' ', '\t', ',', '=']) or (next_char not in ['\n', '\t', ' ', '@']):
							continue

						address = symbols.get(sym)
						line = line.replace(sym,address,1) 

						if new_symbols:
							try:
								line = line.replace(address,new_symbols[address],1)
							except KeyError:
								pass
						break
						
			new_file += line

	if author != None:
		new_file = '@ Credit: ' + author + '\n\n' + new_file

	with open(out_file, 'wb') as f:
		f.write(new_file.encode())

def convert_files(in_out_files: list, symbols_file: str=None, new_symbols: str=None, author: str=None, quiet: bool=False) -> None:
	for f in in_out_files:
		convert(f[0],f[1],symbols_file,new_symbols,author)
		if not quiet:
			print(f[0], 'to', f[1])
		
	
def from_user_input() -> None:
	in_file = input('ASM file to convert: ')
	out_file = input('Output file: ')
	
	if input('Attempt to replace symbols? (y/n): ') == 'y':
		in_symbols = input('Original symbols file: ')
	else:
		in_symbols = None
		
	convert(in_file,out_file,in_symbols)

def main(args: argparse.Namespace) -> None:
	if args is None:
		from_user_input()
		return

	in_files,out_files = [], []
	if args.type == 'file':
		in_files = args.input
		out_files = args.output
	else:
		for i in range(len(args.input)):
			if not os.path.exists(args.input[i]):
				raise NameError('Input path not found')
			if not os.path.exists(args.output[i]):
				# os.path.join(os.getcwd(), args.output[i])
				raise NameError('Output path not found')
			for f in glob.glob(args.input[i]+"/*.s"):
				in_files.append(f)
				out_files.append(args.output[i]+'\\'+f[f.find("\\")+1:])

	symbols_file = args.symbols[0] if args.symbols else None
	new_symbols_file = args.new_symbols[0] if args.new_symbols else None
	author = args.credit if args.credit else None
	convert_files(set(zip(in_files,out_files)),symbols_file,new_symbols_file,author,args.quiet)
	
def parse_arguments() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
						prog='asmconverter',
						description='Make ASM written for NSMBe compatible with NCPatcher')

	parser.add_argument('type', choices=['file','dir'], 
		help='Specify whether to search and convert .s files in a directory or do one file at a time')
	parser.add_argument('-i','--input', nargs='+')
	parser.add_argument('-o','--output', nargs='+')
	parser.add_argument('-s','--symbols', nargs='?')
	parser.add_argument('-ns','--new_symbols', nargs='?')
	parser.add_argument('-c','--credit', nargs='?')
	parser.add_argument('-q','--quiet', action="store_true")
	args = parser.parse_args()

	if len(args.input) != len(args.output): 
		raise NameError('Number of inputs not equal to number of outputs')
	return args

if __name__ == '__main__':
	main(parse_arguments() if len(sys.argv) > 1 else None)
