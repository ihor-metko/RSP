# Documentation Diagrams

This folder contains visual diagrams and flowcharts for the ArenaOne project documentation.

## Available Diagrams

### Pre-Sales Navigation Diagram
**File:** `pre-sales-navigation-diagram.md`

A comprehensive set of Mermaid diagrams showing:
- Complete navigation flow for all 6 roles
- Sidebar structure and organization
- Breadcrumbs navigation logic
- Component architecture
- User journey examples
- Technology stack visualization
- Implementation status timeline

**Use this for:**
- Understanding the pre-sales documentation structure
- Client presentations and demos
- Development planning
- Onboarding new team members

### Pre-Sales Navigation Map (Detailed)
**File:** `../pre-sales-navigation-map.md`

A detailed textual and visual navigation map including:
- Complete URL mapping for all 22 pages
- Sidebar and breadcrumbs implementation details
- i18n support documentation
- Dark theme integration
- Reusable UI components reference
- Role-based access flows
- Technical implementation details

**Use this for:**
- Complete technical reference
- Implementation planning
- Client documentation
- Developer onboarding

## How to View Diagrams

### In GitHub
1. Navigate to the file in GitHub web interface
2. GitHub automatically renders Mermaid diagrams
3. Click on a diagram to zoom or view full-screen

### In VS Code
1. Install the "Markdown Preview Mermaid Support" extension
2. Open the markdown file
3. Use the preview pane (Ctrl+Shift+V or Cmd+Shift+V)

### In Other Markdown Viewers
Most modern markdown viewers support Mermaid diagrams natively. If yours doesn't:
1. Copy the Mermaid code block
2. Paste it into [Mermaid Live Editor](https://mermaid.live)
3. Export as PNG, SVG, or PDF

## Diagram Types Used

- **Flowchart** - Navigation flows and user journeys
- **Graph** - Component relationships and architecture
- **Journey** - User experience paths
- **State Diagram** - Navigation state transitions
- **Pie Chart** - Distribution statistics
- **Gantt Chart** - Implementation timeline

## Updating Diagrams

When updating the pre-sales documentation structure:

1. Update the main navigation map: `../pre-sales-navigation-map.md`
2. Update the visual diagrams: `pre-sales-navigation-diagram.md`
3. Ensure both files are in sync with actual implementation
4. Test diagram rendering in GitHub preview

## Color Conventions

All diagrams follow consistent color coding:

| Role | Color (Hex) | Description |
|------|-------------|-------------|
| Root Admin | #4a1d96 | Purple - Highest privilege |
| Org Owner | #1e40af | Blue - Organization management |
| Org Admin | #0f766e | Teal - Administrative tasks |
| Club Owner | #b91c1c | Red - Club ownership |
| Club Admin | #c2410c | Orange - Club administration |
| Player | #0e7490 | Cyan - End user |
| Entry/General | #1f2937 | Gray - Neutral/Starting point |

These colors match the application's dark theme palette and are consistent across all diagrams.

## Contributing

When adding new diagrams:

1. Use Mermaid syntax for consistency
2. Follow the established color conventions
3. Include descriptive titles and legends
4. Add entry to this README
5. Test rendering before committing
6. Keep diagrams up-to-date with code changes

## Resources

- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live)
- [GitHub Mermaid Support](https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/)
