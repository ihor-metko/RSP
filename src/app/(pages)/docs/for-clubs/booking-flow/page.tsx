export default function BookingFlowPage() {
  return (
    <div className="im-docs-page">
      <h1 className="im-docs-page-title">Booking Flow</h1>
      <p className="im-docs-page-description">
        Learn how the booking process works from the player perspective and admin control panel.
      </p>
      
      <section className="im-docs-section">
        <h2 className="im-docs-section-title">Player Booking Journey</h2>
        <p className="im-docs-section-content">
          Players discover your club, check court availability in real-time, select their preferred time slot, 
          and complete payment securely through our integrated payment system.
        </p>
      </section>
      
      <section className="im-docs-section">
        <h2 className="im-docs-section-title">Admin Booking Management</h2>
        <p className="im-docs-section-content">
          As a club administrator, you can create bookings on behalf of players, manage reservations, 
          handle cancellations, and process refunds when necessary.
        </p>
      </section>
      
      <section className="im-docs-section">
        <h2 className="im-docs-section-title">Booking Confirmation and Updates</h2>
        <p className="im-docs-section-content">
          Automatic notifications keep both players and administrators informed about booking confirmations, 
          changes, and reminders.
        </p>
      </section>
    </div>
  );
}
