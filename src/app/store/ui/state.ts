
export default <UiState>{
    darkMode: false,
    navbarVariant: 'navbar-light',
    sidebarSkin: 'sidebar-dark-primary',
    menuSidebarCollapsed: true,
    controlSidebarCollapsed: true,
    sidebarHeaderButton: false,
    // screenSize: calculateWindowSize(window.innerWidth)
};

export interface UiState {
    darkMode: boolean;
    menuSidebarCollapsed: boolean;
    controlSidebarCollapsed: boolean;
    navbarVariant: string;
    sidebarSkin: string;
    sidebarHeaderButton: boolean;
    screenSize: any;
}