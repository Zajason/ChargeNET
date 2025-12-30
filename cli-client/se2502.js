#! /usr/bin/env node
const { Command } = require('commander');
const axios = require('axios');
const program = new Command();

// Ρύθμιση Base URL
const BASE_URL = 'http://localhost:3000/api/v1'; 

program
  .name('se2502')
  .description('CLI for EV Charging System')
  .version('1.0.0');

// --- 1. HEALTHCHECK SCOPE ---
program.command('healthcheck')
  .description('Confirms end-to-end connectivity')
  .option('--format <type>', 'Output format (json or csv)', 'csv') // Default format: csv
  .action(async (options) => {
    try {
      const response = await axios.get(`${BASE_URL}/admin/healthcheck`);
      
      if (options.format === 'json') {
        // Εκτύπωση σε JSON
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        // Εκτύπωση σε CSV
        // Header
        console.log("status,dbconnection,n_charge_points,n_charge_points_online,n_charge_points_offline");
        // Data row
        const d = response.data;
        console.log(`${d.status},${d.dbconnection},${d.n_charge_points},${d.n_charge_points_online},${d.n_charge_points_offline}`);
      }
    } catch (error) {
      if (error.response) {
          // Ο server απάντησε με σφάλμα
          console.error(`Status Code: ${error.response.status}`);
          console.error("Server Message:", JSON.stringify(error.response.data, null, 2)); // <--- ΑΥΤΟ ΘΕΛΟΥΜΕ
      } else {
          // Ο server δεν απάντησε καθόλου
          console.error("Error: Could not connect to the API. Is the server running?");
      }
    }
  });

program.parse(process.argv);