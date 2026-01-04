# Pre-Sales Documentation - Navigation Map

This directory contains comprehensive navigation maps and access flow diagrams for the ArenaOne pre-sales documentation system.

## 📚 Documentation Files

### 1. [NAVIGATION_MAP.md](./NAVIGATION_MAP.md)
**Comprehensive Navigation Guide**
- Complete Mermaid flow diagram
- Detailed role descriptions and responsibilities
- URL mappings for all pages
- Navigation component logic (Sidebar & Breadcrumbs)
- Internationalization (i18n) structure
- UI components and theming details
- File structure and technical implementation
- Workflows by role
- Usage guidelines for development and client demos

### 2. [VISUAL_DIAGRAM.md](./VISUAL_DIAGRAM.md)
**Visual Access Flow Diagrams**
- ASCII-art visual diagrams for each role
- Technical architecture overview
- Role comparison matrix
- Complete URL reference
- Responsive layout visualization
- Usage guidelines for developers, client demos, and planning
- Acceptance criteria verification

## 🎯 Quick Reference

### All Roles
1. 🔑 **Root Admin** - Platform Administrator (3 pages)
2. 👑 **Organization Owner** - Organization Creator (3 pages)
3. ⚙️ **Organization Admin** - Organization Manager (3 pages)
4. 🏢 **Club Owner** - Club Creator & Manager (3 pages)
5. 🎾 **Club Admin** - Club Operations Manager (4 pages)

**Total**: 5 roles, 16 documentation pages

### Entry Point
- **URL**: `/docs/pre-sales`
- **Purpose**: Role selection overview
- **Features**: Language switching (EN/UA), Dark theme support

## 🌐 Key Features

### Internationalization
- **Languages**: English (EN) and Ukrainian (UA)
- **Translation files**: `/locales/en.json` and `/locales/uk.json`
- **Implementation**: next-intl with structured translation keys

### Theming
- **Dark Mode**: Full support using `im-*` CSS classes
- **Theme Toggle**: Available in application header
- **Consistency**: CSS variables in `layout.css`

### Navigation
- **Sidebar**: Role-specific, dynamically filtered by URL
- **Breadcrumbs**: Dynamically built from URL segments
- **Active States**: Highlighted based on current path

### Components
All pages use reusable UI components from `@/components/ui`:
- `DocsPage` - Main page wrapper
- `DocsSection` - Content sections
- `DocsSidebar` - Navigation sidebar
- `Breadcrumbs` - Location trail
- `IMLink` - Consistent link styling

## 🚀 Quick Start

### For Development
1. Read [NAVIGATION_MAP.md](./NAVIGATION_MAP.md) for complete technical details
2. Follow file structure pattern when adding new pages
3. Update translations in both `en.json` and `uk.json`
4. Add sidebar links in `layout.tsx`
5. Use DocsPage/DocsSection components for consistency

### For Client Demos
1. Start at `/docs/pre-sales` to show role selection
2. Select a role to demonstrate sidebar navigation
3. Navigate through pages to show breadcrumbs
4. Switch language (EN ↔ UA) to show i18n
5. Toggle theme to show dark mode support

### For Planning
1. Use [VISUAL_DIAGRAM.md](./VISUAL_DIAGRAM.md) for quick visual reference
2. Reference role comparison matrix for feature planning
3. Check URL reference for naming consistency
4. Verify all workflows align with business requirements

## 📂 File Structure

```
src/app/(pages)/docs/pre-sales/
├── page.tsx                          # Entry point: Role selection
├── layout.tsx                        # Sidebar + Breadcrumbs layout
├── layout.css                        # Documentation styles
├── root-admin/                       # Root Admin pages (3)
├── org-owner/                        # Organization Owner pages (3)
├── org-admin/                        # Organization Admin pages (3)
├── club-owner/                       # Club Owner pages (3)
└── club-admin/                       # Club Admin pages (4)
```

## 🔗 URL Patterns

All URLs follow the pattern:
```
/docs/pre-sales/{role}/{page-name}
```

Examples:
- `/docs/pre-sales/root-admin/overview`
- `/docs/pre-sales/club-owner/crud-courts`
- `/docs/pre-sales/org-admin/edit-settings`

## ✅ Acceptance Criteria

All requirements from the original issue have been met:

✅ **Diagram shows all roles and their key steps**
- All 5 roles documented with complete page listings

✅ **Shows sidebar and breadcrumbs navigation**
- Dynamic role-based sidebar logic explained
- URL-based breadcrumb generation documented

✅ **Each step includes URL mapping**
- Complete URL reference for all 16 pages
- Consistent naming pattern documented

✅ **Clear for planning and client demo**
- Visual diagrams for quick reference
- Technical details for implementation
- Usage guidelines for different audiences

✅ **EN/UA i18n support marked**
- Language switching capability documented
- Translation structure explained

✅ **Dark theme + Docs UI components highlighted**
- `im-*` classes usage documented
- Component reuse pattern explained
- Theme switching capability noted

## 🎨 Diagram Formats

### Mermaid Diagram
The NAVIGATION_MAP.md includes a Mermaid diagram that can be rendered on GitHub:
- Shows all roles and flows
- Color-coded by role type
- Includes URLs and descriptions

### ASCII Visual Diagrams
The VISUAL_DIAGRAM.md includes ASCII art diagrams:
- Individual role flow diagrams
- Technical architecture overview
- Responsive layout visualization

## 📖 Additional Resources

- **Copilot Settings**: See `.github/copilot-settings.md` for coding standards
- **Component Library**: Check `src/components/ui/` for available components
- **Translation Files**: View `locales/en.json` and `locales/uk.json` for i18n

## 🤝 Contributing

When adding new documentation pages:

1. Create page file: `src/app/(pages)/docs/pre-sales/{role}/{page-name}/page.tsx`
2. Add translations: Update both `locales/en.json` and `locales/uk.json`
3. Update sidebar: Modify `src/app/(pages)/docs/pre-sales/layout.tsx`
4. Use components: Always use `DocsPage` and `DocsSection`
5. Follow patterns: Maintain consistent structure and naming
6. Update diagrams: Add new pages to this documentation

## 📞 Support

For questions about:
- **Navigation structure**: See NAVIGATION_MAP.md
- **Visual reference**: See VISUAL_DIAGRAM.md
- **Implementation details**: Check source files in `src/app/(pages)/docs/pre-sales/`
- **Styling**: Review `.github/copilot-settings.md` and `layout.css`

---

**Last Updated**: 2026-01-04  
**Documentation Version**: 1.0  
**Total Pages Documented**: 16  
**Total Roles**: 5
