/**
 * The app shell: a 240px sidebar (a Sheet below 768px) and a sticky header, per
 * FRONTEND_SPEC.md §3.1. Reuses the generated shadcn sidebar and button rather than
 * hand-rolling either, and only CSS-variable tokens — no hard-coded colours.
 */
import { NavLink, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { navigation, routes } from './registry'

function Brand() {
  return (
    <SidebarHeader className="border-b px-4 py-3">
      <NavLink to="/" className="flex items-center gap-2 rounded-md focus-visible:outline-2">
        <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-md text-sm font-bold">
          CM
        </span>
        <span className="text-base font-semibold">Coaching Manager</span>
      </NavLink>
    </SidebarHeader>
  )
}

function NavItems() {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild tooltip={item.label}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setOpenMobile(false)}
                >
                  <item.icon aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function SidebarFooterInfo() {
  return (
    <SidebarFooter className="text-muted-foreground border-t px-4 py-3 text-xs">
      <p>Local &amp; fully offline</p>
    </SidebarFooter>
  )
}

function Header({ title }: { title: string }) {
  return (
    <header className="bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-sm sm:px-6">
      <SidebarTrigger aria-label="Open navigation menu" className="md:hidden" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
      </div>
    </header>
  )
}

/** The current route's title, looked up from the registry by pathname. */
function usePageTitle(): string {
  const { pathname } = useLocation()
  return routes.find((route) => route.path === pathname)?.title ?? 'Coaching Manager'
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <Brand />
        <SidebarContent>
          <NavItems />
        </SidebarContent>
        <SidebarFooterInfo />
      </Sidebar>
      <SidebarInset className="flex min-h-dvh flex-col">
        <Header title={usePageTitle()} />
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
