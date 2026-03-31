import Swal from "sweetalert2";
import "../styles/swal-custom.css";

export const showAlert = (
  type: "success" | "error" | "warning" | "info",
  title: string,
  text: string,
  timer?: number,
  isHtml: boolean = false
) => {
  const config: any = {
    icon: type,
    title,
    confirmButtonColor: "#268bd2",
    customClass: {
      popup: "swal-solarized",
      title: "swal-title",
      htmlContainer: "swal-text",
    },
    allowOutsideClick: false,
    allowEscapeKey: false,
  };

  if (isHtml) {
    config.html = text;
  } else {
    config.text = text;
  }

  if (timer) {
    config.timer = timer;
    config.showConfirmButton = false;
  }

  return Swal.fire(config);
};

export const showConfirmDialog = async (
  title: string,
  text: string,
  confirmButtonText: string = "Yes, delete it!"
) => {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc322f",
    cancelButtonColor: "#268bd2",
    confirmButtonText,
    cancelButtonText: "Cancel",
    customClass: {
      popup: "swal-solarized",
      title: "swal-title",
      htmlContainer: "swal-text",
    },
    allowOutsideClick: false,
    allowEscapeKey: false,
  });
};

export const showLogoutDialog = async () => {
  return Swal.fire({
    title: 'Logout',
    text: 'Are you sure you want to logout?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#dc322f',
    cancelButtonColor: '#268bd2',
    confirmButtonText: 'Yes, logout',
    cancelButtonText: 'Cancel',
    customClass: {
      popup: 'swal-solarized',
      title: 'swal-title',
      htmlContainer: 'swal-text',
    },
  });
};

export const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: {
        data?: {
          message?: string;
          errors?: Record<string, string[] | string>;
        }
      }
    };

    // If there are specific validation errors, prioritize the first one
    if (axiosError.response?.data?.errors) {
      const errors = axiosError.response.data.errors;
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const errorVal = errors[firstErrorKey];
        if (Array.isArray(errorVal) && errorVal.length > 0) {
          return errorVal[0];
        } else if (typeof errorVal === 'string') {
          return errorVal;
        }
      }
    }

    return axiosError.response?.data?.message || fallbackMessage;
  }
  return fallbackMessage;
};
