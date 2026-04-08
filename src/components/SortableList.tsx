import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface SortableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, dragHandleProps: any) => React.ReactNode;
  keyExtractor: (item: T) => string;
  droppableId: string;
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

export function SortableList<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  droppableId,
  direction = 'vertical',
  className = ''
}: SortableListProps<T>) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    const newItems = Array.from(items);
    const [removed] = newItems.splice(sourceIndex, 1);
    newItems.splice(destinationIndex, 0, removed);
    
    onReorder(newItems);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={droppableId} direction={direction}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={className}
          >
            {items.map((item, index) => (
              // @ts-ignore
              <Draggable key={keyExtractor(item)} draggableId={keyExtractor(item)} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    {renderItem(item, index, provided.dragHandleProps)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
