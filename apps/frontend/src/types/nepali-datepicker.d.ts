declare module "@sbmdkl/nepali-datepicker-reactjs" {
  import { Component } from "react";

  interface CalendarProps {
    onChange?: (date: { bsDate: string; adDate: string }) => void;
    defaultDate?: Date;
    theme?: "light" | "deepdark" | "dark";
    language?: "en" | "ne";
    className?: string;
  }

  export default class Calendar extends Component<CalendarProps> {}
}

