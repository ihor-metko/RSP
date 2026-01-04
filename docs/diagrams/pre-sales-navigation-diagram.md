# Pre-Sales Documentation - Navigation Diagram

## High-Level Architecture

```mermaid
graph LR
    subgraph "User Experience"
        Lang[🌐 Language Switch<br/>EN/UA]
        Theme[🌓 Dark Theme<br/>Toggle]
    end
    
    subgraph "Navigation Components"
        Sidebar[📋 Sidebar<br/>Role-based Groups]
        Breadcrumbs[🗺️ Breadcrumbs<br/>Hierarchical Path]
    end
    
    subgraph "Content Components"
        DocsUI[🎨 Docs UI<br/>Reusable Components]
    end
    
    Entry["/docs/pre-sales<br/>Entry Point"] --> Lang
    Entry --> Theme
    Entry --> Sidebar
    Entry --> Breadcrumbs
    Entry --> DocsUI
```

## Complete Navigation Flow

```mermaid
flowchart TD
    Start["🏠 /docs/pre-sales<br/><b>Pre-Sales Documentation</b><br/>Role Selection Page<br/><br/>Features:<br/>✓ i18n EN/UA<br/>✓ Dark Theme<br/>✓ DocsRoleGrid Component"]
    
    %% Root Admin
    RootAdmin["👑 ROOT ADMIN"]
    RA1["📄 Overview<br/>/docs/pre-sales/root-admin/overview<br/><br/>Platform-wide management"]
    RA2["🏢 Create Organization<br/>/docs/pre-sales/root-admin/create-organization<br/><br/>Add new organizations"]
    RA3["👥 View Org Admins<br/>/docs/pre-sales/root-admin/view-org-admins<br/><br/>Manage administrators"]
    
    %% Org Owner
    OrgOwner["🏢 ORG OWNER"]
    OO1["🏟️ Create Club<br/>/docs/pre-sales/org-owner/create-club<br/><br/>Add clubs to organization"]
    OO2["➕ Add Org Admin<br/>/docs/pre-sales/org-owner/add-org-admin<br/><br/>Delegate administration"]
    OO3["🔐 Access Control<br/>/docs/pre-sales/org-owner/access-control<br/><br/>Manage permissions"]
    
    %% Org Admin
    OrgAdmin["⚙️ ORG ADMIN"]
    OA1["📊 Manage Organization<br/>/docs/pre-sales/org-admin/manage-organization<br/><br/>Daily management tasks"]
    OA2["⚙️ Edit Settings<br/>/docs/pre-sales/org-admin/edit-settings<br/><br/>Configure organization"]
    OA3["👁️ View Clubs<br/>/docs/pre-sales/org-admin/view-clubs<br/><br/>Monitor clubs"]
    
    %% Club Owner
    ClubOwner["🎾 CLUB OWNER"]
    CO1["🏟️ CRUD Courts<br/>/docs/pre-sales/club-owner/crud-courts<br/><br/>Create, manage courts"]
    CO2["⏰ Working Hours<br/>/docs/pre-sales/club-owner/working-hours<br/><br/>Set availability"]
    CO3["📅 Bookings Overview<br/>/docs/pre-sales/club-owner/bookings-overview<br/><br/>Monitor reservations"]
    
    %% Club Admin
    ClubAdmin["🏟️ CLUB ADMIN"]
    CA1["✏️ Edit Club<br/>/docs/pre-sales/club-admin/edit-club<br/><br/>Update club details"]
    CA2["🏟️ CRUD Courts<br/>/docs/pre-sales/club-admin/crud-courts<br/><br/>Manage courts"]
    CA3["⏰ Working Hours<br/>/docs/pre-sales/club-admin/working-hours<br/><br/>Set availability"]
    CA4["📅 Bookings Overview<br/>/docs/pre-sales/club-admin/bookings-overview<br/><br/>View bookings"]
    
    %% Player
    Player["🎮 PLAYER"]
    P1["📖 Overview<br/>/docs/pre-sales/player/overview<br/><br/>Feature introduction"]
    P2["⚡ Quick Booking<br/>/docs/pre-sales/player/quick-booking<br/><br/>Make reservations"]
    P3["📅 Calendar<br/>/docs/pre-sales/player/calendar<br/><br/>View schedule"]
    P4["✅ Confirmation<br/>/docs/pre-sales/player/confirmation<br/><br/>Booking confirmation"]
    
    %% Main Connections
    Start ==> RootAdmin
    Start ==> OrgOwner
    Start ==> OrgAdmin
    Start ==> ClubOwner
    Start ==> ClubAdmin
    Start ==> Player
    
    %% Root Admin Flow
    RootAdmin --> RA1 --> RA2 --> RA3
    
    %% Org Owner Flow
    OrgOwner --> OO1 --> OO2 --> OO3
    
    %% Org Admin Flow
    OrgAdmin --> OA1 --> OA2 --> OA3
    
    %% Club Owner Flow
    ClubOwner --> CO1 --> CO2 --> CO3
    
    %% Club Admin Flow
    ClubAdmin --> CA1 --> CA2 --> CA3 --> CA4
    
    %% Player Flow
    Player --> P1 --> P2 --> P3 --> P4
    
    %% Styling
    classDef startClass fill:#1f2937,stroke:#6366f1,stroke-width:3px,color:#fff
    classDef rootClass fill:#4a1d96,stroke:#7c3aed,stroke-width:2px,color:#fff
    classDef rootPageClass fill:#6d28d9,stroke:#a78bfa,stroke-width:1px,color:#fff
    classDef orgOwnerClass fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef orgOwnerPageClass fill:#2563eb,stroke:#60a5fa,stroke-width:1px,color:#fff
    classDef orgAdminClass fill:#0f766e,stroke:#14b8a6,stroke-width:2px,color:#fff
    classDef orgAdminPageClass fill:#0d9488,stroke:#2dd4bf,stroke-width:1px,color:#fff
    classDef clubOwnerClass fill:#b91c1c,stroke:#ef4444,stroke-width:2px,color:#fff
    classDef clubOwnerPageClass fill:#dc2626,stroke:#f87171,stroke-width:1px,color:#fff
    classDef clubAdminClass fill:#c2410c,stroke:#f97316,stroke-width:2px,color:#fff
    classDef clubAdminPageClass fill:#ea580c,stroke:#fb923c,stroke-width:1px,color:#fff
    classDef playerClass fill:#0e7490,stroke:#06b6d4,stroke-width:2px,color:#fff
    classDef playerPageClass fill:#0891b2,stroke:#22d3ee,stroke-width:1px,color:#fff
    
    class Start startClass
    class RootAdmin rootClass
    class RA1,RA2,RA3 rootPageClass
    class OrgOwner orgOwnerClass
    class OO1,OO2,OO3 orgOwnerPageClass
    class OrgAdmin orgAdminClass
    class OA1,OA2,OA3 orgAdminPageClass
    class ClubOwner clubOwnerClass
    class CO1,CO2,CO3 clubOwnerPageClass
    class ClubAdmin clubAdminClass
    class CA1,CA2,CA3,CA4 clubAdminPageClass
    class Player playerClass
    class P1,P2,P3,P4 playerPageClass
```

## Sidebar Structure Diagram

```mermaid
graph TB
    Sidebar["📚 Pre-Sales Documentation Sidebar<br/>(DocsSidebar Component)"]
    
    subgraph Group1 ["🎮 Player Group"]
        P_1["Overview"]
        P_2["Quick Booking"]
        P_3["Calendar"]
        P_4["Confirmation"]
    end
    
    subgraph Group2 ["👑 Root Admin Group"]
        RA_1["Overview"]
        RA_2["Create Organization"]
        RA_3["View Org Admins"]
    end
    
    subgraph Group3 ["🏢 Org Owner Group"]
        OO_1["Create Club"]
        OO_2["Add Org Admin"]
        OO_3["Access Control"]
    end
    
    subgraph Group4 ["⚙️ Org Admin Group"]
        OA_1["Manage Organization"]
        OA_2["Edit Settings"]
        OA_3["View Clubs"]
    end
    
    subgraph Group5 ["🎾 Club Owner Group"]
        CO_1["CRUD Courts"]
        CO_2["Working Hours"]
        CO_3["Bookings Overview"]
    end
    
    subgraph Group6 ["🏟️ Club Admin Group"]
        CA_1["Edit Club"]
        CA_2["CRUD Courts"]
        CA_3["Working Hours"]
        CA_4["Bookings Overview"]
    end
    
    Sidebar --> Group1
    Sidebar --> Group2
    Sidebar --> Group3
    Sidebar --> Group4
    Sidebar --> Group5
    Sidebar --> Group6
    
    Group1 --> P_1
    Group1 --> P_2
    Group1 --> P_3
    Group1 --> P_4
    
    Group2 --> RA_1
    Group2 --> RA_2
    Group2 --> RA_3
    
    Group3 --> OO_1
    Group3 --> OO_2
    Group3 --> OO_3
    
    Group4 --> OA_1
    Group4 --> OA_2
    Group4 --> OA_3
    
    Group5 --> CO_1
    Group5 --> CO_2
    Group5 --> CO_3
    
    Group6 --> CA_1
    Group6 --> CA_2
    Group6 --> CA_3
    Group6 --> CA_4
    
    classDef sidebarClass fill:#1f2937,stroke:#6366f1,color:#fff
    classDef groupClass fill:#374151,stroke:#6366f1,color:#fff
    classDef itemClass fill:#4b5563,stroke:#9ca3af,color:#fff
    
    class Sidebar sidebarClass
    class Group1,Group2,Group3,Group4,Group5,Group6 groupClass
    class P_1,P_2,P_3,P_4,RA_1,RA_2,RA_3,OO_1,OO_2,OO_3,OA_1,OA_2,OA_3,CO_1,CO_2,CO_3,CA_1,CA_2,CA_3,CA_4 itemClass
```

## Breadcrumbs Navigation Flow

```mermaid
graph LR
    subgraph "Level 1"
        L1["📚 Docs"]
    end
    
    subgraph "Level 2"
        L2["📄 Pre-Sales"]
    end
    
    subgraph "Level 3 - Role"
        L3A["👑 Root Admin"]
        L3B["🏢 Org Owner"]
        L3C["⚙️ Org Admin"]
        L3D["🎾 Club Owner"]
        L3E["🏟️ Club Admin"]
        L3F["🎮 Player"]
    end
    
    subgraph "Level 4 - Page"
        L4["📄 Specific Page<br/>(e.g., Overview, Create Club, etc.)"]
    end
    
    L1 --> L2
    L2 --> L3A
    L2 --> L3B
    L2 --> L3C
    L2 --> L3D
    L2 --> L3E
    L2 --> L3F
    L3A --> L4
    L3B --> L4
    L3C --> L4
    L3D --> L4
    L3E --> L4
    L3F --> L4
    
    classDef level1 fill:#1e3a8a,stroke:#3b82f6,color:#fff
    classDef level2 fill:#1e40af,stroke:#60a5fa,color:#fff
    classDef level3 fill:#2563eb,stroke:#93c5fd,color:#fff
    classDef level4 fill:#3b82f6,stroke:#bfdbfe,color:#fff
    
    class L1 level1
    class L2 level2
    class L3A,L3B,L3C,L3D,L3E,L3F level3
    class L4 level4
```

## Component Architecture

```mermaid
graph TB
    Layout["📄 layout.tsx<br/>Pre-Sales Layout"]
    
    subgraph "Navigation Components"
        Header["🎯 Header<br/>(Language Switch + Theme Toggle)"]
        Sidebar["📋 DocsSidebar<br/>(Role Groups)"]
        Breadcrumbs["🗺️ Breadcrumbs<br/>(Hierarchical Path)"]
    end
    
    subgraph "Content Components"
        DocsPage["📄 DocsPage<br/>(Page Wrapper)"]
        DocsSection["📦 DocsSection<br/>(Section Container)"]
        DocsRoleGrid["🎴 DocsRoleGrid<br/>(Role Selection)"]
        DocsCallout["💡 DocsCallout<br/>(Highlights)"]
        DocsSteps["📝 DocsSteps<br/>(Process Flow)"]
        DocsCTA["🔗 DocsCTA<br/>(Navigation Links)"]
    end
    
    subgraph "Features"
        i18n["🌐 next-intl<br/>(EN/UA)"]
        DarkTheme["🌓 Dark Theme<br/>(im-* classes)"]
    end
    
    Layout --> Header
    Layout --> Sidebar
    Layout --> Breadcrumbs
    Layout --> DocsPage
    
    DocsPage --> DocsSection
    DocsPage --> DocsRoleGrid
    DocsPage --> DocsCallout
    DocsPage --> DocsSteps
    DocsPage --> DocsCTA
    
    Layout --> i18n
    Layout --> DarkTheme
    
    classDef layoutClass fill:#1f2937,stroke:#6366f1,color:#fff
    classDef navClass fill:#374151,stroke:#8b5cf6,color:#fff
    classDef contentClass fill:#4b5563,stroke:#a78bfa,color:#fff
    classDef featureClass fill:#059669,stroke:#10b981,color:#fff
    
    class Layout layoutClass
    class Header,Sidebar,Breadcrumbs navClass
    class DocsPage,DocsSection,DocsRoleGrid,DocsCallout,DocsSteps,DocsCTA contentClass
    class i18n,DarkTheme featureClass
```

## User Journey Examples

### Example 1: Root Admin Journey
```mermaid
journey
    title Root Admin - Creating Organization
    section Entry
      Visit Pre-Sales: 5: Root Admin
      Select Root Admin Role: 5: Root Admin
    section Learning
      Read Overview: 5: Root Admin
      Understand Capabilities: 5: Root Admin
    section Action
      Navigate to Create Organization: 5: Root Admin
      Follow Step-by-Step Guide: 5: Root Admin
    section Management
      View Organization Admins: 4: Root Admin
      Complete Setup: 5: Root Admin
```

### Example 2: Player Journey
```mermaid
journey
    title Player - Making a Booking
    section Entry
      Visit Pre-Sales: 5: Player
      Select Player Role: 5: Player
    section Discovery
      Read Overview: 5: Player
      Learn About Features: 5: Player
    section Booking
      Navigate to Quick Booking: 5: Player
      View Calendar: 5: Player
    section Confirmation
      Complete Booking: 5: Player
      Receive Confirmation: 5: Player
```

### Example 3: Club Owner Journey
```mermaid
journey
    title Club Owner - Setting Up Courts
    section Entry
      Visit Pre-Sales: 5: Club Owner
      Select Club Owner Role: 5: Club Owner
    section Setup
      Navigate to CRUD Courts: 5: Club Owner
      Create Courts: 4: Club Owner
    section Configuration
      Set Working Hours: 4: Club Owner
      Configure Availability: 4: Club Owner
    section Monitoring
      View Bookings Overview: 5: Club Owner
      Monitor Reservations: 5: Club Owner
```

## State Diagram - Navigation States

```mermaid
stateDiagram-v2
    [*] --> IndexPage: User enters /docs/pre-sales
    
    IndexPage --> RoleSelected: Click role card
    
    RoleSelected --> ViewingPage: Navigate to specific page
    
    ViewingPage --> ViewingPage: Click sidebar item
    ViewingPage --> RoleSelected: Click breadcrumb (role)
    ViewingPage --> IndexPage: Click breadcrumb (pre-sales)
    
    IndexPage --> LanguageSwitched: Change language
    LanguageSwitched --> IndexPage: Content reloaded
    
    ViewingPage --> ThemeSwitched: Toggle theme
    ThemeSwitched --> ViewingPage: Theme applied
    
    ViewingPage --> [*]: Leave documentation
    IndexPage --> [*]: Leave documentation
```

## Technology Stack

```mermaid
graph TB
    subgraph "Framework"
        NextJS["⚛️ Next.js 14+<br/>App Router"]
    end
    
    subgraph "UI Components"
        DocsUI["🎨 Custom Docs UI<br/>(@/components/ui/docs)"]
        TailwindCSS["🎨 Tailwind CSS<br/>(im-* semantic classes)"]
    end
    
    subgraph "Internationalization"
        NextIntl["🌐 next-intl<br/>(Server-side translations)"]
    end
    
    subgraph "Routing"
        FileRouting["📁 File-based Routing<br/>(app directory)"]
    end
    
    subgraph "Theming"
        CSSVars["🎨 CSS Variables<br/>(Dark theme support)"]
    end
    
    NextJS --> DocsUI
    NextJS --> NextIntl
    NextJS --> FileRouting
    DocsUI --> TailwindCSS
    DocsUI --> CSSVars
    
    classDef framework fill:#0ea5e9,stroke:#0284c7,color:#fff
    classDef ui fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef feature fill:#10b981,stroke:#059669,color:#fff
    
    class NextJS framework
    class DocsUI,TailwindCSS,CSSVars ui
    class NextIntl,FileRouting feature
```

## Quick Reference: Role Pages Count

```mermaid
pie title Pages Distribution by Role
    "Player" : 4
    "Root Admin" : 3
    "Org Owner" : 3
    "Org Admin" : 3
    "Club Owner" : 3
    "Club Admin" : 4
```

## Implementation Status

```mermaid
gantt
    title Pre-Sales Documentation Implementation
    dateFormat YYYY-MM-DD
    section Foundation
    Components Created           :done, 2024-01-01, 2024-01-05
    Layout Implementation        :done, 2024-01-05, 2024-01-08
    section Content
    Root Admin Pages            :done, 2024-01-08, 2024-01-10
    Org Owner Pages             :done, 2024-01-10, 2024-01-12
    Org Admin Pages             :done, 2024-01-12, 2024-01-14
    Club Owner Pages            :done, 2024-01-14, 2024-01-16
    Club Admin Pages            :done, 2024-01-16, 2024-01-18
    Player Pages                :done, 2024-01-18, 2024-01-20
    section Features
    i18n Integration            :done, 2024-01-20, 2024-01-22
    Dark Theme Support          :done, 2024-01-22, 2024-01-24
    Navigation Components       :done, 2024-01-24, 2024-01-26
    section Documentation
    Navigation Map              :active, 2024-01-26, 2024-01-27
```

---

## Legend

### Icons Used
- 🏠 Home/Entry
- 📚 Documentation
- 👑 Root Admin
- 🏢 Organization Owner
- ⚙️ Organization Admin
- 🎾 Club Owner
- 🏟️ Club Admin
- 🎮 Player
- 📄 Page
- 📋 Sidebar
- 🗺️ Breadcrumbs
- 🌐 Internationalization
- 🌓 Dark Theme
- 🎨 UI Components
- ⚛️ React/Next.js

### Color Coding
- **Purple** (#4a1d96) - Root Admin
- **Blue** (#1e40af) - Organization Owner
- **Teal** (#0f766e) - Organization Admin
- **Red** (#b91c1c) - Club Owner
- **Orange** (#c2410c) - Club Admin
- **Cyan** (#0e7490) - Player
- **Gray** (#1f2937) - Entry/General

---

## Notes

1. All diagrams are created using Mermaid syntax for easy rendering in GitHub and documentation tools
2. Color schemes match the application's dark theme palette
3. Flow follows logical progression from entry to specific role pages
4. Each role has a distinct color for easy visual identification
5. Diagrams are scalable and can be embedded in presentations or documentation
