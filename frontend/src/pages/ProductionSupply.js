// src/pages/ProductionSupply.jsx

import React, { useState } from "react";
import axios from "axios";
import { Doughnut } from "react-chartjs-2";
import "chart.js/auto";

function ProductionSupply() {
  const [file, setFile] = useState(null);
  const [supplyData, setSupplyData] = useState([]);
  const [error, setError] = useState(null);
  c