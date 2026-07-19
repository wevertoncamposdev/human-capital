import * as React from "react";
import {
  BarChart3,
  CalendarDays,
  ChartNoAxesGantt,
  Clock3,
  FileText,
  LayoutGrid,
  Rows3,
  Table2,
} from "lucide-react";

const ICON_CLASS_NAME = "size-4";

export function getStandardViewIcon(viewType: string): React.ReactNode {
  switch (viewType) {
    case "kanban":
      return <LayoutGrid className={ICON_CLASS_NAME} />;
    case "gantt":
      return <ChartNoAxesGantt className={ICON_CLASS_NAME} />;
    case "timeline":
      return <Clock3 className={ICON_CLASS_NAME} />;
    case "calendar":
      return <CalendarDays className={ICON_CLASS_NAME} />;
    case "graph":
      return <BarChart3 className={ICON_CLASS_NAME} />;
    case "grouped":
      return <Rows3 className={ICON_CLASS_NAME} />;
    case "form":
      return <FileText className={ICON_CLASS_NAME} />;
    case "detail":
    case "list":
    case "table":
    default:
      return <Table2 className={ICON_CLASS_NAME} />;
  }
}
