import * as ts from "typescript";
import * as ts_generator from "./ts_generator";
import * as path from "path";
import * as mkdirp from "mkdirp";

import {PluginConfig} from "ttypescript/lib/PluginCreator";
import {writeFileSync} from "fs";
import {TranslationEntry} from "./generator";

interface Config {
    target_file?: string;
    verbose?: boolean;
}

//(program: ts.Program, config?: PluginConfig) => ts.TransformerFactory
let process_config: Config;
export default function(program: ts.Program, config?: PluginConfig) : (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.SourceFile {
    process_config = config as any || {};

    const base_path = path.dirname(program.getCompilerOptions().project || program.getCurrentDirectory());
    if(process_config.verbose) {
        console.log("TRGen transformer called");
        console.log("Base path: %s", base_path);
    }

    process.on('exit', function () {
        const target = path.isAbsolute(process_config.target_file) ? process_config.target_file : path.join(base_path, process_config.target_file);
        if(process_config.target_file) {
            if(process_config.verbose)
                console.log("Writing translation file to " + target);

            mkdirp.sync(path.dirname(target));
            writeFileSync(target, JSON.stringify(translations, null, 2));
        }
    });

    return ctx => transformer(ctx) as any;
}

const translations: TranslationEntry[] = [];
const transformer = (context: ts.TransformationContext) =>
(rootNode: ts.Node) => {
    const handler = (rootNode: ts.Node) => {
        if(rootNode.kind == ts.SyntaxKind.Bundle) {
            const bundle = rootNode as ts.Bundle;
            const result = [];
            for(const file of bundle.sourceFiles)
                result.push(handler(file));
            return ts.updateBundle(bundle, result as any, bundle.prepends as any);

        } else if(rootNode.kind == ts.SyntaxKind.SourceFile) {
            const file = rootNode as ts.SourceFile;

            console.log("Processing " + file.fileName);
            const result = ts_generator.transform({
                use_window: false,
                replace_cache: true
            }, context, file);
            translations.push(...result.translations);
            return result.node;
        } else {
            console.warn("Invalid transform input: %s", ts.SyntaxKind[rootNode.kind]);
        }
    };

    return handler(rootNode);
};