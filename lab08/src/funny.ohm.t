Funny <: Arithmetic {
  Expr = AddExpr

  Module        = FunctionDef+
  FunctionDef   = ident "(" ParamList? ")" "returns" ReturnList Comment? ("uses" LocalList)? Block
  Comment       = "//" (~("\n" | "\r") any)*                -- line

  ParamList     = VarDef ("," VarDef)*
  ReturnList    = VarDef ("," VarDef)*
  LocalList     = VarDef ("," VarDef)*

  VarDef        = ident ":" Type
  Type          = "int" | "int[]"

  Statement     = Assignment | Conditional | Loop | Block
  Block         = "{" Statement* "}"

  Assignment    = ident "=" Expr ";"                          -- var
                | ArrayAccess "=" Expr ";"                    -- index
                | ident ("," ident)+ "=" FunctionCall ";"     -- tuple

  FunctionCall  = ident "(" ArgList? ")"
  ArgList       = Expr ("," Expr)*
  ArrayAccess   = ident "[" Expr "]"

  // Для ЛР достаточно «сырая» Condition внутри скобок
  Condition     = (~")" any)+

  Conditional   = "if" "(" Condition ")" Statement ("else" Statement)?
  Loop          = "while" "(" Condition ")" Statement

  ident         = letter alnum*

  // Расширяем арифметику: вызовы и индексы допустимы в выражениях
  PrimaryExpr   := number
                 | variable
                 | "(" AddExpr ")"         -- paren
                 | ident "(" ArgList? ")"  -- call
                 | ident "[" Expr "]"      -- index

  // --- ПРОБЕЛЫ/КОММЕНТАРИИ (Windows CRLF учитываем)
  space += "//" (~("\n" | "\r") any)* (("\r"? "\n") | end)
  space += "/*" (~"*/" any)* "*/"
  space += "\r"
}
