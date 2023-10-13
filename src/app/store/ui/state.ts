
export default <UiState>{
    darkMode: false,
    headerMenu: true,
    navbarVariant: 'navbar-light',
    sidebarSkin: 'sidebar-dark-primary',
    menuSidebarCollapsed: true,
    controlSidebarCollapsed: true,
    sidebarHeaderButton: false,
    debug : true
    // screenSize: calculateWindowSize(window.innerWidth)
};

export interface UiState {
    darkMode: boolean;
    headerMenu : boolean;
    menuSidebarCollapsed: boolean;
    controlSidebarCollapsed: boolean;
    navbarVariant: string;
    sidebarSkin: string;
    sidebarHeaderButton: boolean;
    screenSize: any;
    debug : boolean
}