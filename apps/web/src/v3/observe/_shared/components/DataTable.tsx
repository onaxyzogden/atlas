import type { ReactNode } from 'react';

interface DataTableProps {
  columns: ReactNode[];
  rows: ReactNode[][];
}

export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={`column-${index}`}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`row-${rowIndex}`}>
            {row.map((cell, index) => (
              <td key={`cell-${rowIndex}-${index}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
