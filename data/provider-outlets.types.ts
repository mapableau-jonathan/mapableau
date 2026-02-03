/** Australian state/territory code */
export type StateCode =
  | "NSW"
  | "VIC"
  | "QLD"
  | "SA"
  | "WA"
  | "TAS"
  | "ACT"
  | "NT";

/** O = Outlet, H = Head office (or similar) */
export type OutletFlag = "O" | "H";

/** Single provider/outlet record from the public JSON (public/data/provider-outlets.json) */
export type ProviderOutlet = {
  ABN: string;
  Prov_N: string;
  Head_Office: string;
  Outletname: string;
  Flag: OutletFlag;
  Active: 0 | 1;
  Phone: string;
  Website: string;
  Email: string;
  Address: string;
  State_cd: StateCode;
  Post_cd: number;
  Latitude: number;
  Longitude: number;
  RegGroup: number[];
  Post_cd_p: string;
  opnhrs: string;
  prfsn: string;
};
