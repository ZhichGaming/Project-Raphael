import { useState } from "react";
import Default from "./compact/default";
import { invoke } from "@tauri-apps/api/tauri";
import React from "react";

function CompactApp() {
  return (
		<div>
			<Default />
		</div>
	);
}
  
export default CompactApp;
