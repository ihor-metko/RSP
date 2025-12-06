# Dashboard Graphs UI Implementation

## Visual Layout

### Root Admin Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                              │
│                 Manage your platform                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │ Organizations│ │   Clubs     │ │   Users     │ │ Bookings │ │
│  │     42       │ │     156     │ │   2,845     │ │   1,234  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Registered Users                            ││
│  │   Real players only (excludes admins)                        ││
│  │                    2,800                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌──────────────────────────────┐ ┌─────────────────────────┐  │
│  │  Active / Upcoming Bookings  │ │   Past Bookings         │  │
│  │           845                │ │        389              │  │
│  └──────────────────────────────┘ └─────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        Analytics                              ││
│  │                                      [Week] [Month]           ││
│  ├───────────────────────────────────────────────────────────────┤
│  │                                                               ││
│  │  Booking Trends                    Active Users              ││
│  │  ┌─────────────────────┐           ┌─────────────────────┐  ││
│  │  │     ▁▃▅▆█▅▃         │           │       ╱─╲           │  ││
│  │  │ ████████████████    │           │     ╱─    ╲─╲       │  ││
│  │  │ ████████████████    │           │   ╱─          ╲─╲   │  ││
│  │  │ Mon Tue Wed Thu Fri │           │ ╱─                ╲─│  ││
│  │  └─────────────────────┘           └─────────────────────┘  ││
│  │  Number of bookings                Number of active users   ││
│  │  created over time                 who logged in            ││
│  └───────────────────────────────────────────────────────────────┘
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Organization Admin Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│              Organization Dashboard                              │
│              Manage your organizations                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │   Padel Pro Networks                 /padel-pro  │           │
│  ├──────────────────────────────────────────────────┤           │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │           │
│  │  │ Clubs  │ │ Courts │ │ Today  │ │ Admins │   │           │
│  │  │   12   │ │   48   │ │   34   │ │    8   │   │           │
│  │  └────────┘ └────────┘ └────────┘ └────────┘   │           │
│  │                                                  │           │
│  │  Active/Upcoming: 156  |  Past: 89              │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        Analytics                              ││
│  │                                      [Week] [Month]           ││
│  ├───────────────────────────────────────────────────────────────┤
│  │  Booking Trends (Org)              Active Users (Org)        ││
│  │  ┌─────────────────────┐           ┌─────────────────────┐  ││
│  │  │     ▁▂▄▆█▅▃         │           │       ╱─╲           │  ││
│  │  │ ████████████████    │           │     ╱─    ╲─╲       │  ││
│  │  │ Mon Tue Wed Thu Fri │           │   ╱─          ╲─╲   │  ││
│  │  └─────────────────────┘           └─────────────────────┘  ││
│  └───────────────────────────────────────────────────────────────┘
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Club Admin Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│                   Club Dashboard                                 │
│                  Manage your club                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │   Downtown Padel Club                            │           │
│  │   Padel Pro Networks                             │           │
│  ├──────────────────────────────────────────────────┤           │
│  │  ┌────────┐ ┌────────┐                          │           │
│  │  │ Courts │ │ Today  │                          │           │
│  │  │    4   │ │   12   │                          │           │
│  │  └────────┘ └────────┘                          │           │
│  │                                                  │           │
│  │  Active/Upcoming: 28   |  Past: 15              │           │
│  │                                                  │           │
│  │  [Manage Club] [Manage Courts] [View Bookings]  │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        Analytics                              ││
│  │                                      [Week] [Month]           ││
│  ├───────────────────────────────────────────────────────────────┤
│  │  Booking Trends (Club)             Active Users (Club)       ││
│  │  ┌─────────────────────┐           ┌─────────────────────┐  ││
│  │  │     ▁▂▄▆█▅▃         │           │       ╱─╲           │  ││
│  │  │ ████████████████    │           │     ╱─    ╲─╲       │  ││
│  │  │ Mon Tue Wed Thu Fri │           │   ╱─          ╲─╲   │  ││
│  │  └─────────────────────┘           └─────────────────────┘  ││
│  └───────────────────────────────────────────────────────────────┘
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Interactive Features

### Time Range Toggle
```
┌──────────────────┐
│ [Week]  Month    │  <- Default: Week view (7 days)
└──────────────────┘

┌──────────────────┐
│  Week  [Month]   │  <- Click to switch to Month view (30 days)
└──────────────────┘
```

### Graph Tooltips (on hover)
```
Booking Trends:
┌────────────────┐
│ Mon            │
│ Bookings: 15   │
└────────────────┘

Active Users:
┌────────────────┐
│ Mon            │
│ Users: 42      │
└────────────────┘
```

## Color Scheme (Dark Theme)

- **Booking Trends Bars**: Primary blue (`var(--im-primary)`)
- **Active Users Line**: Success green (`var(--im-success)`)
- **Card Background**: Secondary background (`var(--im-bg-secondary)`)
- **Text**: Primary text (`var(--im-text-primary)`)
- **Grid Lines**: Border color (`var(--im-border-color)`)
- **Tooltip**: Primary background with shadow

## Responsive Behavior

### Desktop (≥1024px)
- Two-column layout for graphs
- Full width for each graph within its column
- Graph height: 300px

### Tablet (768px - 1023px)
- Two-column layout for graphs
- Reduced padding and margins
- Graph height: 300px

### Mobile (<768px)
- Single-column stacked layout
- Full width for each graph
- Graph height: 250px
- Time range buttons expand to full width

## Accessibility Features

1. **Keyboard Navigation**
   - Tab key moves between time range buttons
   - Enter/Space activates selected button
   - Focus indicators visible on all interactive elements

2. **Screen Readers**
   - ARIA labels on all graphs
   - Role="list" for graph containers
   - Alt text for graph components

3. **Color Contrast**
   - All text meets WCAG AA standards
   - Color is not the only way information is conveyed
   - Tooltip text has high contrast ratio

## Loading State
```
┌─────────────────────────────────────────────────────────────────┐
│                        Analytics                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                          ⟳                                        │
│                      Loading...                                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Error State
```
┌─────────────────────────────────────────────────────────────────┐
│                        Analytics                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│            ⚠ Failed to load graph data                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## No Data State
```
Booking Trends                    Active Users
┌─────────────────────┐           ┌─────────────────────┐
│                     │           │                     │
│                     │           │                     │
│  No data available  │           │  No data available  │
│                     │           │                     │
│                     │           │                     │
└─────────────────────┘           └─────────────────────┘
```
