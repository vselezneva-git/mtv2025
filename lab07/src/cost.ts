import { Expr } from "../../lab04";

/*
- const: 0
- var:   1
- neg:   1 + cost(arg)
- bin:   1 + cost(l) + cost(r)
*/
export function cost(e: Expr): number {
  switch (e.k) {
    case "num":
      return 0;
    case "var":
      return 1;
    case "neg":
      return 1 + cost(e.e);
    case "bin":
      return 1 + cost(e.l) + cost(e.r);
  }
}
