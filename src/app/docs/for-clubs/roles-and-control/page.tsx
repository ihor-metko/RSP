export default function RolesAndControlPage() {
  return (
    <div className="im-docs-page">
      <h1 className="im-docs-page-title">Roles and Access Control</h1>
      <p className="im-docs-page-description">
        Understanding the different administrative roles and permissions within ArenaOne.
      </p>
      
      <section className="im-docs-section">
        <h2 className="im-docs-section-title">Organization Administrator</h2>
        <p className="im-docs-section-content">
          Organization administrators have full control over all clubs within their organization. 
          They can create and manage clubs, assign club administrators, and access organization-wide analytics.
        </p>
      </section>
      
      <section className="im-docs-section">
        <h2 className="im-docs-section-title">Club Administrator</h2>
        <p className="im-docs-section-content">
          Club administrators manage day-to-day operations of individual clubs including courts, 
          bookings, pricing, and member management within their assigned club.
        </p>
      </section>
      
      <section className="im-docs-section">
        <h2 className="im-docs-section-title">Permission Management</h2>
        <p className="im-docs-section-content">
          Easily assign and manage administrator roles to ensure the right people have appropriate 
          access to manage your clubs effectively while maintaining security.
        </p>
      </section>
    </div>
  );
}
