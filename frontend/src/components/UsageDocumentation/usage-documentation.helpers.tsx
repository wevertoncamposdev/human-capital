import * as React from "react";
import type { UsageDocumentationItem } from "@/components/UsageDocumentation/UsageDocumentation";

export type UsageDocumentationSection = {
  title: string;
  items: string[];
};

export function buildUsageDocumentationItems(
  prefix: string,
  sections: UsageDocumentationSection[],
): UsageDocumentationItem[] {
  return sections.map((section, index) => ({
    id: `${prefix}-${index}`,
    title: section.title,
    searchText: section.items.join(" "),
    content: (
      <ul className="list-disc space-y-1 pl-5">
        {section.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ),
  }));
}
