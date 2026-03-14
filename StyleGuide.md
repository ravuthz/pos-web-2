# UI/UX Style Guide

## Color Palette

### Primary Colors
- **Primary Blue**: #0f766e (700) - Main action buttons
- **Primary Light**: #14b8a6 (500) - Hover states
- **Primary Dark**: #042f2e (950) - Active states

### Neutral Colors
- **Surface White**: #ffffff - Cards, backgrounds
- **Surface Light**: #f8fafc (50) - Subtle backgrounds
- **Surface Gray**: #e2e8f0 (200) - Borders, dividers
- **Text Dark**: #334155 (700) - Primary text
- **Text Light**: #64748b (500) - Secondary text

## Typography

### Font Family
- **Primary**: Inter, system-ui, sans-serif

### Font Sizes
- **Display**: 2xl, 3xl (headers)
- **Title**: lg, xl (section headers)
- **Body**: base, sm (paragraphs)
- **Small**: xs (labels, badges)

### Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## Button Styles

### Primary Button
```tsx
<button className="btn btn-primary rounded-full px-6 py-3 text-sm font-medium transition-all duration-200 shadow-md">
  Primary Action
button>
```

### Secondary Button
```tsx
<button className="btn btn-secondary rounded-full px-6 py-3 text-sm font-medium transition-all duration-200 shadow-md">
  Secondary Action
button>
```

### Ghost Button
```tsx
<button className="btn btn-ghost rounded-full px-6 py-3 text-sm font-medium transition-all duration-200 shadow-md">
  Ghost Action
button>
```

### Icon Button
```tsx
<button className="btn btn-icon rounded-full p-2.5">
  <Icon className="h-4 w-4" />
button>
```

## Input Fields

### Standard Input
```tsx
<input className="input w-full px-3 py-2.5 bg-white border border-surface-300 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
```

### Input with Error
```tsx
<input className="input w-full px-3 py-2.5 bg-white border border-red-500 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500" />
```

## Cards and Containers

### Standard Card
```tsx
<div className="card rounded-xl border border-surface-200 shadow-soft p-4 md:p-6">
  <div className="card-header flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-surface-900">Card Title</h3>
    <button className="btn btn-ghost btn-sm">Action</button>
  </div>
  <p className="text-sm text-surface-600">Card content</p>
</div>
```

### Badge
```tsx
<span className="badge badge-success rounded-full px-2.5 py-1 text-xs font-medium">Success</span>
<span className="badge badge-warning rounded-full px-2.5 py-1 text-xs font-medium">Warning</span>
<span className="badge badge-danger rounded-full px-2.5 py-1 text-xs font-medium">Error</span>
```

## Layout Components

### Page Header
```tsx
<PageHeader title="Page Title" subtitle="Optional subtitle" actions={actionButtons} />
```

### Data Table
```tsx
<DataTable data={rows} columns={columns} keyExtractor={keyExtractor} emptyMessage="No data available" />
```

### CRUD Tabs
```tsx
<CrudTabs activeTabId={activeTabId} tabs={tabs} onSelectTab={onSelectTab} onCloseTab={onCloseTab} onCreateTab={onCreateTab}>
  {children}
</CrudTabs>
```

## Spacing System

### Margin
- `m-1`: 4px
- `m-2`: 8px
- `m-3`: 12px
- `m-4`: 16px
- `m-6`: 24px
- `m-8`: 32px

### Padding
- `p-1`: 4px
- `p-2`: 8px
- `p-3`: 12px
- `p-4`: 16px
- `p-6`: 24px
- `p-8`: 32px

## Shadows

### Shadow Soft
```css
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
```

### Shadow Card
```css
box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
```

### Shadow Modal
```css
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

## Animations

### Slide In
```css
@keyframes slideIn {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0); }
}
```

### Fade In
```css
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

### Scale In
```css
@keyframes scaleIn {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
```

## Responsive Design

### Breakpoints
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px

### Usage
```tsx
<div className="p-4 md:p-6">
  <button className="w-full md:w-auto">Button</button>
</div>
```

## Accessibility

### Focus States
- All interactive elements must have visible focus states
- Use `focus:outline-none focus:ring-2` for consistent focus indicators
- Ensure color contrast ratios meet WCAG 2.1 AA standards

### ARIA Labels
- Buttons with icons should have descriptive `aria-label` attributes
- Dynamic content should have appropriate `aria-live` regions
- Form fields should have associated `<label>` elements

## Color Usage Guidelines

### Primary Actions
- Use primary blue for main actions (submit, save, create)
- Use secondary green for success states
- Use red for destructive actions (delete, remove)

### Neutral States
- Use surface grays for borders, dividers, and secondary elements
- Use text colors appropriately based on importance
- Maintain sufficient contrast between text and background

## Implementation Notes

### Tailwind Classes
- Use existing Tailwind utility classes whenever possible
- Create custom classes only when necessary for consistency
- Follow the established naming conventions

### Component Structure
- Keep components focused and reusable
- Use TypeScript interfaces for props
- Follow the existing file structure in `src/components/ui/`

### Performance
- Use React.memo for expensive components
- Implement proper loading states
- Optimize re-renders with appropriate hooks

## Examples

### Login Form
```tsx
<div className="card rounded-xl border border-surface-200 shadow-soft p-6 w-full max-w-md mx-auto">
  <h2 className="text-xl font-semibold text-surface-900 mb-6">Login</h2>
  <form onSubmit={handleSubmit}>
    <div className="mb-4">
      <label className="label">Email</label>
      <input className="input w-full" type="email" placeholder="you@example.com" />
    </div>
    <div className="mb-4">
      <label className="label">Password</label>
      <input className="input w-full" type="password" placeholder="********" />
    </div>
    <div className="flex items-center justify-between">
      <button className="btn btn-primary w-full" type="submit">
        Login
      </button>
    </div>
  </form>
</div>
```

### Dashboard Card
```tsx
<div className="card rounded-xl border border-surface-200 shadow-soft p-6">
  <div className="card-header flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-surface-900">Sales Overview</h3>
    <button className="btn btn-ghost btn-sm">Refresh</button>
  </div>
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <span className="text-sm text-surface-600">Total Sales</span>
      <span className="text-2xl font-semibold text-surface-900">$12,450</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-sm text-surface-600">This Month</span>
      <span className="text-lg font-medium text-surface-900">+8.5%</span>
    </div>
  </div>
</div>
```