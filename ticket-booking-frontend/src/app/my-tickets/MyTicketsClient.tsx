"use client";

import { useUserBookings } from "@/features/booking/api/get-user-bookings";
import { Container } from "@/shared/components/Container";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState } from "@/shared/components/LoadingState";
import { ErrorState } from "@/shared/components/ErrorState";
import { EmptyState } from "@/shared/components/EmptyState";
import { Navbar } from "@/shared/components/Navbar";
import { Footer } from "@/shared/components/Footer";
import { Ticket, Calendar, MapPin, CreditCard, Clock } from "lucide-react";
import { getEventTitle } from "@/lib/utils";

export function MyTicketsClient() {
  const { data, isLoading, isError, refetch } = useUserBookings(1, 20);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'cancelled': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Đã xác nhận';
      case 'pending': return 'Chờ thanh toán';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-background/50">
        <PageHeader 
          title="Vé của tôi" 
          description="Quản lý và xem lại tất cả các vé bạn đã đặt."
        />
        
        <Container className="py-12">
          {isLoading ? (
            <LoadingState text="Đang tải danh sách vé..." />
          ) : isError ? (
            <ErrorState 
              action={
                <button 
                  onClick={() => refetch()} 
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Thử lại
                </button>
              }
            />
          ) : !data || data.data.length === 0 ? (
            <EmptyState 
              icon={Ticket}
              title="Chưa có vé nào"
              description="Bạn chưa đặt vé nào. Hãy quay lại trang chủ để tìm kiếm sự kiện."
            />
          ) : (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              {data.data.map((booking) => (
                <div key={booking.id} className="relative group overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md flex flex-col md:flex-row">
                  {/* Left part: Event Info */}
                  <div className="p-6 md:w-2/3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border/50">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold line-clamp-1">{getEventTitle(booking.team_a, booking.team_b)}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
                          {formatStatus(booking.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary/70" />
                          <span>{new Date(booking.match_date).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary/70" />
                          <span className="line-clamp-1">{booking.venue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-primary/70" />
                          <span>Mã đơn: <span className="font-mono text-foreground">{booking.id.split('-')[0].toUpperCase()}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right part: Payment Info */}
                  <div className="p-6 md:w-1/3 bg-muted/20 flex flex-col justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Tổng thanh toán</div>
                      <div className="text-2xl font-bold text-primary mb-4">
                        {parseFloat(booking.total_amount).toLocaleString('vi-VN')} VNĐ
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Ngày đặt:
                          </span>
                          <span>{new Date(booking.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        {booking.payment_method && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5" /> Phương thức:
                            </span>
                            <span className="uppercase">{booking.payment_method}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {booking.status === 'confirmed' && (
                      <button className="mt-6 w-full py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm font-medium transition-colors">
                        Xem chi tiết vé
                      </button>
                    )}
                    {booking.status === 'pending' && (
                      <div className="mt-6 w-full py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md text-xs font-medium text-center">
                        ⏳ Đang chờ xác nhận thanh toán. Vé sẽ bị hủy tự động nếu không hoàn tất.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
