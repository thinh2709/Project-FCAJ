"use client";

import { useState } from "react";
import { useAdminBookings } from "@/features/admin/hooks/useAdmin";
import { LoadingState } from "@/shared/components/LoadingState";
import { ErrorState } from "@/shared/components/ErrorState";
import { EmptyState } from "@/shared/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as xlsx from "xlsx";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

type Booking = {
  id: string;
  order_id?: string;
  customer_email: string;
  match_id: string;
  payment_method: string | null;
  created_at: string;
  status: string;
  amount: number | null;
};

const columnHelper = createColumnHelper<Booking>();

const columns = [
  columnHelper.accessor(row => row.order_id || row.id.substring(0, 8), {
    id: 'order_id',
    header: 'Order ID',
    cell: info => <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor('customer_email', {
    header: 'Customer',
    cell: info => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('match_id', {
    header: 'Match ID',
    cell: info => <span className="text-muted-foreground">{info.getValue().substring(0, 8)}</span>,
  }),
  columnHelper.accessor('payment_method', {
    header: 'Payment',
    cell: info => info.getValue() || '-',
  }),
  columnHelper.accessor('created_at', {
    header: 'Date',
    cell: info => new Date(info.getValue()).toLocaleString(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => {
      const status = info.getValue();
      return (
        <Badge variant={status === 'confirmed' ? 'default' : status === 'cancelled' ? 'destructive' : 'secondary'}>
          {status}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('amount', {
    header: () => <div className="text-right">Amount</div>,
    cell: info => <div className="text-right">${(info.getValue() || 0).toLocaleString()}</div>,
  }),
];

export default function AdminBookingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { bookings, total, totalPages, loading, error, refetch } = useAdminBookings(page, 10, search);

  const table = useReactTable({
    data: bookings || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = () => {
    if (!bookings || bookings.length === 0) return;
    
    // Process data for export
    const exportData = bookings.map(b => ({
      OrderID: b.order_id || b.id,
      Customer: b.customer_email,
      MatchID: b.match_id,
      PaymentMethod: b.payment_method || 'N/A',
      Date: new Date(b.created_at).toLocaleString(),
      Status: b.status,
      Amount: b.amount || 0
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Bookings");
    xlsx.writeFile(workbook, `Bookings_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">Manage customer bookings and orders.</p>
        </div>
        <Button onClick={handleExport} variant="outline" disabled={loading || !bookings || bookings.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 max-w-sm gap-2">
          <Input 
            placeholder="Search by email or order ID..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </form>
      </div>

      {loading && bookings.length === 0 ? (
        <LoadingState text="Loading bookings..." />
      ) : error ? (
        <ErrorState description={error} action={<Button onClick={refetch} variant="outline">Retry</Button>} />
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings found" description="Try adjusting your search filters." />
      ) : (
        <div className="space-y-4">
          <div className="relative w-full overflow-auto rounded-md border bg-card">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted bg-muted/50">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} entries
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="text-sm px-2">Page {page} of {totalPages}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
