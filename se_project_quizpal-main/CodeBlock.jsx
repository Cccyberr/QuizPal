import React from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import js from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import { prism as prismStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("python", python);

export default function CodeBlock({ code = "", language = "javascript", showLineNumbers = false }) {
  return (
    <SyntaxHighlighter language={language} style={prismStyle} showLineNumbers={showLineNumbers}>
      {code}
    </SyntaxHighlighter>
  );
}
