import React from "react";

const StatsOverviewCard = ({ title, value, change, icon, color }) => {
  return (
    <div className="col-xl-4 col-md-6 col-12">
      <div className="box">
        <div className="box-body d-flex align-items-center">
          <div className={`me-3 fs-30 text-${color}`}>{icon}</div>
          <div>
            <h5 className="mb-0">{title}</h5>
            <h2 className="fw-600">
              {value}
              {change && (
                <span className={`fs-16 mx-10 text-${color}`}>
                  {change}
                </span>
              )}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverviewCard;
