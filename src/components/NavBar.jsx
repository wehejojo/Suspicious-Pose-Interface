import React, { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { IoIosLogOut } from "react-icons/io";
import { useNavigate, useLocation } from "react-router-dom"; 
import toast, { Toaster } from 'react-hot-toast';
import styles from "./NavBar.module.css";

const PAGES = [
  { name: "Home", path: "/home" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Analytics", path: "/charts" },
  { name: "Live Feed", path: "/feed" },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => setMenuOpen(prev => !prev);

  const handleLogout = () => {
    toast.success("Logged out.", {
      duration: 1000,
      icon: '🚪',
      style: { fontWeight: '500' },
      position: 'bottom-center'
    });

    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  return (
    <>
      <Toaster position="bottom-center" reverseOrder={false} />
      <nav className={styles.navbar}>
        <div className={styles.leftSection}>
          <div className={styles.links}>
            {PAGES.map(page => (
              <a
                key={page.name}
                href={page.path}
                className={`${styles.link} ${location.pathname === page.path ? styles.active : ""}`}
              >
                {page.name}
              </a>
            ))}
          </div>
        </div>

        <div className={styles.rightSection}>
          <div className={styles.user}>John Erick</div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <IoIosLogOut />
          </button>
          <button className={styles.hamburger} onClick={toggleMenu}>
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </nav>

      <div
        className={`${styles.mobileMenu} ${menuOpen ? styles.open : ""}`}
        onClick={toggleMenu}
      >
        <div className={styles.mobileMenuContent} onClick={e => e.stopPropagation()}>
          {PAGES.map(page => (
            <a
              key={page.name}
              href={page.path}
              className={`${styles.link} ${location.pathname === page.path ? styles.active : ""}`}
            >
              {page.name}
            </a>
          ))}
          <div className={styles.mobileUser}>
            <div className={styles.user}>John Erick</div>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
