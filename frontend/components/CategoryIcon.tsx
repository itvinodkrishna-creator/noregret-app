import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_CONFIG, CategoryType } from '../types';

interface CategoryIconProps {
  category: CategoryType;
  size?: number;
  color?: string;
  showBackground?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ 
  category, 
  size = 20, 
  color,
  showBackground = false,
}) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Personal;
  const iconColor = color || config.color;
  
  if (showBackground) {
    return (
      <View style={[
        styles.iconContainer, 
        { 
          backgroundColor: config.color + '20',
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
        }
      ]}>
        <Ionicons name={config.icon as any} size={size} color={iconColor} />
      </View>
    );
  }
  
  return <Ionicons name={config.icon as any} size={size} color={iconColor} />;
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
