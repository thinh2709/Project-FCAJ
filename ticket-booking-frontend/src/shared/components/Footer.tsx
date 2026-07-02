import { Container } from "./Container"

export function Footer() {
  return (
    <footer className="border-t py-12 bg-muted/40">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h3 className="font-semibold">Discover</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Concerts</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Sports</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Arts & Theater</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">About Us</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Our Story</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Help</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Support Center</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Refund Policy</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TIXR Ticketing Platform. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  )
}
