import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface CategoryIconProps {
  category: 'Work' | 'Health' | 'Food' | 'Personal';
  size?: number;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, size = 24, color }) => {
  const iconMap = {
    Work: 'briefcase',
    Health: 'fitness',
    Food: 'restaurant',
    Personal: 'person',
  };

  return (
    <Ionicons 
      name={iconMap[category] as any} 
      size={size} 
      color={color} 
    />
  );
};
