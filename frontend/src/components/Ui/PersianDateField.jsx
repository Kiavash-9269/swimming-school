import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import "react-multi-date-picker/styles/colors/teal.css";

/**
 * Persian (Jalali) date field for operational panels.
 * Stores/emits Gregorian YYYY-MM-DD for backend compatibility.
 */
export default function PersianDateField({
  value = "",
  onChange,
  placeholder = "انتخاب تاریخ",
  disabled = false,
  required = false,
  className = "",
  id,
  name,
}) {
  const pickerValue = (() => {
    if (!value) return null;
    try {
      return new DateObject({
        date: String(value).slice(0, 10),
        format: "YYYY-MM-DD",
        calendar: gregorian,
        locale: gregorian_en,
      }).convert(persian, persian_fa);
    } catch {
      return null;
    }
  })();

  return (
    <div className={`persian-date-field ${className}`.trim()} dir="rtl">
      <DatePicker
        id={id}
        name={name}
        value={pickerValue}
        onChange={(date) => {
          if (!date) {
            onChange?.("");
            return;
          }
          try {
            const iso = new DateObject(date).convert(gregorian, gregorian_en).format("YYYY-MM-DD");
            onChange?.(iso);
          } catch {
            onChange?.("");
          }
        }}
        calendar={persian}
        locale={persian_fa}
        calendarPosition="bottom-center"
        format="YYYY/MM/DD"
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        editable={false}
        inputClass="persian-date-input"
        containerClassName="persian-date-container"
        arrow={false}
      />
    </div>
  );
}
