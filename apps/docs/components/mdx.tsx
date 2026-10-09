import { Step, Steps } from "fumadocs-ui/components/steps"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { TypeTable } from "fumadocs-ui/components/type-table"
import defaultMdxComponents from "fumadocs-ui/mdx"
import type { MDXComponents } from "mdx/types"

import {
  DocsCodeBlockTab,
  DocsCodeBlockTabs,
  DocsCodeBlockTabsList,
  DocsCodeBlockTabsTrigger,
  DocsPre,
} from "@/components/docs/code"
import {
  ComponentPreview,
  ComponentSource,
} from "@/components/docs/component-preview"
import {
  ArchitectureDiagram,
  ComponentTree,
  Flow,
  Sequence,
} from "@/components/docs/diagrams"
import { File, Files, Folder } from "fumadocs-ui/components/files"

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    pre: DocsPre,
    CodeBlockTab: DocsCodeBlockTab,
    CodeBlockTabs: DocsCodeBlockTabs,
    CodeBlockTabsList: DocsCodeBlockTabsList,
    CodeBlockTabsTrigger: DocsCodeBlockTabsTrigger,
    Tab,
    Tabs,
    Step,
    Steps,
    TypeTable,
    ComponentPreview,
    ComponentSource,
    ArchitectureDiagram,
    ComponentTree,
    Flow,
    Sequence,
    File,
    Files,
    Folder,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
