"use client";

import { GripVertical, SlidersHorizontal } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DEFAULT_COACH_ORDER,
  FILTER_LABELS,
  type CoachFilterId,
} from "@/lib/constants";

function SortableFilterItem({
  id,
  label,
}: {
  id: CoachFilterId;
  label: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag to reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

interface AccountFilterOrderSectionProps {
  filterOrder: CoachFilterId[];
  onFilterDragEnd: (event: DragEndEvent) => void;
}

export function AccountFilterOrderSection({
  filterOrder,
  onFilterDragEnd,
}: AccountFilterOrderSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        Filter Order
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Reorder the filter sections in your dashboard sidebar.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onFilterDragEnd}
      >
        <SortableContext
          items={filterOrder}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {filterOrder.map((id) => (
              <SortableFilterItem
                key={id}
                id={id}
                label={FILTER_LABELS[id]}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
