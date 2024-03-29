This all came from https://github.com/JacobGo/nltk-lyric-corpus/tree/master/data

Make it all lowercase

`cat lyrics.txt | tr '[:upper:]' '[:lower:]' > lowercase.txt`

I then removed slurs and special lines

`grep -ivE '(nig|bitch|fuck|shit|rape|pussy|\(|\:|\[|<)' lowercase.txt > cleaned.txt`

Remove numbers and punctuation

`cat cleaned.txt | tr -d '[:punct:]' | tr -d '[:digit:]' > letters.txt`

I then removed any duplicate lines

`cat letters.txt| sort --unique > deduped.txt`

Then I took out lines over 23 characters

`sed '/^.\{23\}./d' deduped.txt > trimmed.txt`

Then just manually fixed whitespace because this only has to be run once.

and put it into final.json
