package main

import (
	"bufio"
	"html/template"
	"log"
	"os"
	"strings"
	"unicode/utf8"

	"whitford.io/radiofooty/internal/feeds"
	"whitford.io/radiofooty/internal/interchange"
)

func main() {
	matches := feeds.GetMergedMatches()

	template, er := template.ParseFiles("./internal/website/template.gohtml")
	if er != nil {
		panic(er)
	}

	col := 0
	for _, matchDay := range matches {
		for _, match := range matchDay.Matches {
			if utf8.RuneCountInString(match.Title) > col {
				col = utf8.RuneCountInString(match.Title)
			}
			if utf8.RuneCountInString(match.Station) > col {
				col = utf8.RuneCountInString(match.Station)
			}
			if utf8.RuneCountInString(match.Competition) > col {
				col = utf8.RuneCountInString(match.Competition)
			}
		}
	}

	data := struct {
		MatchDays []interchange.MergedMatchDay
		Pad       func(string, int) string
		Repeat    func(string, int) string
		Col       int
	}{
		MatchDays: matches,
		Pad: func(s string, n int) string {			
			l := utf8.RuneCountInString(s)
			p := n - l
			if p < 0 {
				log.Panicf("Cannot pad string \"%s\" to length %d", s, n)
			}
			return s + strings.Repeat("\u00A0", p)
		},
		Repeat: func(s string, i int) string {
			return strings.Repeat(s, i)
		},
		Col: col,
	}

	f, _ := os.Create("index.html")
	defer f.Close()
	w := bufio.NewWriter(f)
	err := template.Execute(w, data)
	if err != nil {
		panic(err)
	}
	w.Flush()
}
