// Framer CDN module declarations
declare module "framer" {
  export const ControlType: {
    Boolean: string;
    Number: string;
    String: string;
    Enum: string;
    Color: string;
    Image: string;
    File: string;
    ComponentInstance: string;
    Array: string;
    EventHandler: string;
    Transition: string;
    Link: string;
    FusedNumber: string;
    Padding: string;
    BorderRadius: string;
    BoxShadow: string;
    ResponsiveImage: string;
    Cursor: string;
    Object: string;
    RichText: string;
    Font: string;
  };

  export function addPropertyControls(
    component: React.ComponentType<any>,
    controls: Record<string, any>
  ): void;
}
