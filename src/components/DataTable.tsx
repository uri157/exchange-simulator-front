import { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  caption?: ReactNode;
  emptyMessage?: ReactNode;
  getRowId?: (row: T, index: number) => string;
}

export function DataTable<T>({
  data,
  columns,
  caption,
  emptyMessage = "Sin datos",
  getRowId,
}: DataTableProps<T>) {
  return (
    <Table>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={String(column.key)}
              className={column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : undefined}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, index) => (
            <TableRow key={getRowId?.(row, index) ?? index}>
              {columns.map((column) => (
                <TableCell
                  key={String(column.key)}
                  className={
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                      ? "text-center"
                      : undefined
                  }
                >
                  {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key as string] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
