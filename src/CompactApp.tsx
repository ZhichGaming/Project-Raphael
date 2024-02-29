import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import React from "react";

function CompactApp() {
     
    return (
      <div className="container">
        <h1>Window</h1>
  
        <button>Hello</button>
      </div>
    );
  }
  
  export default CompactApp;
