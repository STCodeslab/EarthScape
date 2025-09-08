import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  const role = localStorage.getItem("role"); // get user role

  useEffect(() => {
    // click handler for parent toggles (href="#")
    const clickHandler = (e) => {
      e.preventDefault();
      const parent = e.currentTarget.parentElement; // li.treeview
      const submenu = parent.querySelector(".treeview-menu");
      if (!submenu) return;

      const isOpen = parent.classList.contains("menu-open");
      if (isOpen) {
        parent.classList.remove("menu-open");
        submenu.style.display = "none";
      } else {
        parent.classList.add("menu-open");
        submenu.style.display = "block";
      }
    };

    // find all toggles
    const toggles = Array.from(
      document.querySelectorAll('.sidebar .treeview > a[href="#"]')
    );
    toggles.forEach((t) => t.addEventListener("click", clickHandler));

    // initially hide all submenus unless parent has menu-open
    document.querySelectorAll(".treeview-menu").forEach((ul) => {
      const parent = ul.parentElement;
      if (parent && parent.classList.contains("menu-open")) {
        ul.style.display = "block";
      } else {
        ul.style.display = "none";
      }
    });

    // auto-expand menu if current path matches any child link
    const currentPath = window.location.pathname;
    const match = Array.from(document.querySelectorAll(".treeview-menu a")).find(
      (a) => a.getAttribute("href") === currentPath
    );
    if (match) {
      const parent = match.closest(".treeview");
      if (parent) {
        parent.classList.add("menu-open");
        const ul = parent.querySelector(".treeview-menu");
        if (ul) ul.style.display = "block";
      }
    }

    // cleanup listeners on unmount
    return () => toggles.forEach((t) => t.removeEventListener("click", clickHandler));
  }, []);

  return (
    <aside className="main-sidebar">
      <section className="sidebar position-relative">
        <div className="multinav">
          <div className="multinav-scroll" style={{ height: "100%" }}>
          <ul className="sidebar-menu">
  <li className="treeview">
    <Link to="/">
      <i className="fa fa-tachometer"></i>
      <span>Dashboard</span>
    </Link>
  </li>

  <li className="header">Apps & Pages </li>

  {/* Only show Admin section for admins */}
  {role === "admin" && (
    <li className="treeview">
      <a href="#">
           <i className="fa fa-user"></i>
        <span>Admin</span>
        <span className="pull-right-container">
          <i className="fa fa-angle-right pull-right"></i>
        </span>
      </a>
      <ul className="treeview-menu">
        <li>
          <Link to="/add-admin">
            <i className="fa fa-user-plus"></i> Add Admin
          </Link>
        </li>
        <li>
          <Link to="/admin-list">
            <i className="fa fa-users"></i> Show List
          </Link>
        </li>
      </ul>
    </li>
  )}

  <li className="treeview">
    <a href="#">
     <i className="fa fa-envelope"></i>
      <span>Feedback</span>
      <span className="pull-right-container">
        <i className="fa fa-angle-right pull-right"></i>
      </span>
    </a>
    <ul className="treeview-menu">
      <li>
        <Link to="/feedback-form">
          <i className="fa fa-edit"></i> Submit Feedback
        </Link>
      </li>
      <li>
        <Link to="/feedback-list">
          <i className="fa fa-list-alt"></i> Feedback List
        </Link>
      </li>
    </ul>
  </li>

 {/* Datasets Group */}
<li className="treeview">
  <a href="#">
    <i className="fa fa-database"></i>
    <span>Datasets</span>
    <span className="pull-right-container">
      <i className="fa fa-angle-right pull-right"></i>
    </span>
  </a>
  <ul className="treeview-menu">
    <li>
      <Link to="/upload-csv">
        <i className="fa fa-upload"></i> Upload Datasets
      </Link>
    </li>
    <li>
      <Link to="/datasets">
        <i className="fa fa-list"></i> <span>Datasets List</span>
      </Link>
    </li>
    <li>
      <Link to="/upload-weather-form">
        <i className="fa fa-cloud-upload"></i> <span>Upload Weather Data</span>
      </Link>
    </li>
  </ul>
</li>

{/* Satellite Imagery Group */}
<li className="treeview">
  <a href="#">
    <i className="fa fa-image"></i>
    <span>Satellite Imagery</span>
    <span className="pull-right-container">
      <i className="fa fa-angle-right pull-right"></i>
    </span>
  </a>
  <ul className="treeview-menu">
    <li>
      <Link to="/imagery-form">
        <i className="fa fa-cloud-download"></i> <span>Fetch Imagery</span>
      </Link>
    </li>
    <li>
      <Link to="/imagery-list">
        <i className="fa fa-picture-o"></i> <span>Imagery Library</span>
      </Link>
    </li>
  </ul>
</li>


  <li className="treeview">
  <a href="#">
    <i className="fa fa-flask"></i>
    <span>Machine Learning</span>
    <span className="pull-right-container">
      <i className="fa fa-angle-right pull-right"></i>
    </span>
  </a>
  <ul className="treeview-menu">
    <li>
      <Link to="/dataprocessing">
        <i className="fa fa-database"></i> <span>Data Processing</span>
      </Link>
    </li>
    <li>
      <Link to="/anomaly-training">
        <i className="fa fa-random"></i> <span>Anomaly Training</span>
      </Link>
    </li>
    <li>
      <Link to="/forecast-training">
        <i className="fa fa-line-chart"></i> <span>Forecast Training</span>
      </Link>
    </li>
    <li>
      <Link to="/correlation-analysis">
        <i className="fa fa-bar-chart"></i> <span>Correlation Analysis</span>
      </Link>
    </li>
    <li>
      <Link to="/model-list">
        <i className="fa fa-list"></i> <span>Models List</span>
      </Link>
    </li>
     <li>
      <Link to="/create-alert">
        <i className="fa fa-bell"></i> <span>Create Alert</span>
      </Link>
    </li>
  </ul>
</li>


    <li className="treeview">
    <Link to="/weather-details">
   <i className="fa fa-sun-o"></i>
      <span>Weather Insights</span>
    </Link>
  </li>

</ul>

          </div>
        </div>
      </section>
    </aside>
  );
};

export default Sidebar;
