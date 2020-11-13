import * as pug from "pug";
import * as fs from "fs";
import { utcToZonedTime } from "date-fns-tz";
import { from, of, zip } from "rxjs";
import { groupBy, map, mergeAll, mergeMap, tap, toArray } from "rxjs/operators";
import { fromEntries } from "./shared";

const files = ["data/ts.json", "data/5live.json"];
let matches = [];

for (let file of files) {
  const fd = fs.openSync(file, "r");
  const content = fs.readFileSync(fd);
  fs.closeSync(fd);
  const m = JSON.parse(content.toString("binary"));
  matches = matches.concat(m);
}

matches.sort((m, mm) => {
  return new Date(m.datetime).valueOf() - new Date(mm.datetime).valueOf();
});

const matchObservable = from(files)
  .pipe(
    map((f) => {
      const fd = fs.openSync(f, "r");
      const content = fs.readFileSync(fd);
      fs.closeSync(fd);
      return JSON.parse(content.toString("binary"));
    }),
    mergeAll(),
    toArray(),
    map((ar: any[]) =>
      ar.sort((m, mm) => {
        return new Date(m.datetime).valueOf() - new Date(mm.datetime).valueOf();
      })
    ),
    mergeAll(),
    map((m) => {
      return {
        date: new Date(m.datetime).toLocaleDateString("en-GB", {
          timeZone: "Europe/London",
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        ...m,
      };
    }),
    map((m) => {
      const d = new Date(m.datetime);

      const d2 = new Date(d);
      d2.setHours(d2.getHours() + 2);

      const from = d
        .toISOString()
        .replace(/-/g, "")
        .replace(/:/g, "")
        .replace(/\./g, "");
      const to = d2
        .toISOString()
        .replace(/-/g, "")
        .replace(/:/g, "")
        .replace(/\./g, "");

      return {
        calString: `http://www.google.com/calendar/event?action=TEMPLATE&dates=${from}%2F${to}&text=${m.title}&location=${m.station}&details=${m.title}`,
        ...m,
      };
    }),
    map((m) => {
      return {
        time: new Date(m.datetime).toLocaleTimeString("en-GB", {
          timeZone: "Europe/London",
          hour12: false,
          hour: "numeric",
          minute: "numeric",
        }),
        ...m,
      };
    }),
    groupBy((m) => m.date),
    mergeMap((group) => zip(of(group.key), group.pipe(toArray()))),
    map((pair) => {
      return {
        date: pair[0],
        matches: pair[1],
      };
    }),
    toArray()
  )
  .subscribe((v) => {
    const compiledFunction = pug.compileFile("template.pug");

    const site = compiledFunction({ matches: v });

    const fd = fs.openSync("site/index.html", "w");
    fs.writeFileSync(fd, site);
    fs.closeSync(fd);
  });
