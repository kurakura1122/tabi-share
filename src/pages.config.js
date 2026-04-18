/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIArrange from './pages/AIArrange';
import AIArrangeChat from './pages/AIArrangeChat';
import AdminEnhance from './pages/AdminEnhance';
import CreateTrip from './pages/CreateTrip';
import DraftEdit from './pages/DraftEdit';
import Drafts from './pages/Drafts';
import Explore from './pages/Explore';
import History from './pages/History';
import HistoryDetail from './pages/HistoryDetail';
import Home from './pages/Home';
import MySaved from './pages/MySaved';
import SavedDetail from './pages/SavedDetail';
import TagTrips from './pages/TagTrips';
import TripDetail from './pages/TripDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIArrange": AIArrange,
    "AIArrangeChat": AIArrangeChat,
    "AdminEnhance": AdminEnhance,
    "CreateTrip": CreateTrip,
    "DraftEdit": DraftEdit,
    "Drafts": Drafts,
    "Explore": Explore,
    "History": History,
    "HistoryDetail": HistoryDetail,
    "Home": Home,
    "MySaved": MySaved,
    "SavedDetail": SavedDetail,
    "TagTrips": TagTrips,
    "TripDetail": TripDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};