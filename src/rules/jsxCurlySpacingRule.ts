/**
 * @license
 * Copyright 2016 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Lint from "tslint/lib/lint";
import * as ts from "typescript";

const OPTION_ALWAYS = "always";
const OPTION_NEVER = "never";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-curly-spacing",
        description: "Enforces consistent usage of space within JSX expressions.",
        rationale: "Helps maintain a readable, consistent style in your codebase.",
        optionsDescription: Lint.Utils.dedent`
            Seven arguments may be optionally provided:
            * \`"always"\` checks if spaces are always present.
            * \`"never"\` checks if spaces are never present.`,
        options: {
            type: "array",
            items: {
                type: "string",
                enum: [OPTION_ALWAYS, OPTION_NEVER],
            },
            minLength: 0,
            maxLength: 7,
        },
        optionExamples: ['[true, "always"]'],
        type: "style",
    };
    /* tslint:enable:object-literal-sort-keys */

    public static ALWAYS_FAILURE_STRING = "Curly braces should always have spaces inside";
    public static NEVER_FAILURE_STRING = "Curly braces should never have spaces inside";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new JsxCurlySpacingWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

class JsxCurlySpacingWalker extends Lint.RuleWalker {

    private static spreadRegEx = /\{\s*\.{3}[\w\.]*\s*}/g;
    private static spacedBracesRegex = /^\{(?:\s|\n)[\s\S]*?(?:\s|(?:\n\s*))}$/;
    private static spacelessBracesRegex = /^(\{((\n\s*)?(\S[\s\S]*?))[^\s](\n\s*)?})$/;

    private static hasSpreadInJsx(text: string): boolean {
        return !!text.match(this.spreadRegEx);
    }

    private static getJsxSpreads(text: string) {
        return text.match(this.spreadRegEx);
    }

    private static isSkippableExpression(text: string): boolean {
        // TypeScript parser very weirdly handles spread expressions so we have to skip some cases
        return ["{", "{...", "{ ..."].indexOf(text) !== -1;
    }

    protected visitJsxAttribute(node: ts.JsxAttribute): void {
        super.visitJsxAttribute(node);
    }

    protected visitJsxElement(node: ts.JsxElement): void {
        const text = node.getText();
        if (JsxCurlySpacingWalker.hasSpreadInJsx(text)) {
            this.handleJsxSpreadNode(node);
        }

        super.visitJsxElement(node);
    }

    protected visitJsxExpression(node: ts.JsxExpression): void {
        const always = this.hasOption(OPTION_ALWAYS);
        const never = this.hasOption(OPTION_NEVER);
        const text = node.getText();

        if (!JsxCurlySpacingWalker.isSkippableExpression(text) && !this.isValidExpression(text)) {
            if (always) {
                this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.ALWAYS_FAILURE_STRING));
            } else if (never) {
                this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.NEVER_FAILURE_STRING));
            }
        }

        super.visitJsxExpression(node);
    }

    protected visitJsxSelfClosingElement(node: ts.JsxSelfClosingElement): void {
        const text = node.getText();
        if (JsxCurlySpacingWalker.hasSpreadInJsx(text)) {
            this.handleJsxSpreadNode(node);
        }
        super.visitJsxSelfClosingElement(node);
    }

    private isValidExpression(text: string) {
        const always = this.hasOption(OPTION_ALWAYS);
        const never = this.hasOption(OPTION_NEVER);

        if (always) {
            return !!text.match(JsxCurlySpacingWalker.spacedBracesRegex);
        } else if (never) {
            return !!text.match(JsxCurlySpacingWalker.spacelessBracesRegex);
        } else {
            return true;
        }
    }

    private handleJsxSpreadNode(node: ts.Node): void {
        const always = this.hasOption(OPTION_ALWAYS);
        const never = this.hasOption(OPTION_NEVER);
        const text = node.getText();

        JsxCurlySpacingWalker
            .getJsxSpreads(text)
            .forEach((match: string) => {
                if (!this.isValidExpression(match)) {
                    const start = node.getStart() + text.indexOf(match);
                    const width = match.length;
                    if (always) {
                        this.addFailure(this.createFailure(start, width, Rule.ALWAYS_FAILURE_STRING));
                    } else if (never) {
                        this.addFailure(this.createFailure(start, width, Rule.NEVER_FAILURE_STRING));
                    }
                }
            });
    }
}
