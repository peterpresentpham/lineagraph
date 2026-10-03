import { Skeleton, TableCell, TableRow } from "@lineagraph/ui";

type Props = { rows?: number; cols: number };

export function TableSkeleton({ rows = 6, cols }: Props) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton className="h-5 w-full max-w-40" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
